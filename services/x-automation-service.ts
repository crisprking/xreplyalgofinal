
import { TwitterApi, type TwitterApiReadOnly } from 'twitter-api-v2';
import { generateReplies } from './geminiService';
import {
    type XApiCredentials,
    type PostSearchCriteria,
    type AutomationConfig,
    type PostCandidate,
    type AutomationResult,
    type ReplyStrategy,
    type CircuitBreakerStatus
} from '../types';

/**
 * Token Bucket for Rate Limiting (Simulates client-side resilience patterns from Finagle)
 */
class TokenBucket {
    private tokens: number;
    private lastRefill: number;
    private readonly capacity: number;
    private readonly refillRatePerMs: number;

    constructor(capacity: number, refillRatePerMinute: number) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.lastRefill = Date.now();
        this.refillRatePerMs = refillRatePerMinute / 60000;
    }

    tryConsume(tokens: number = 1): boolean {
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }

    private refill() {
        const now = Date.now();
        const elapsed = now - this.lastRefill;
        const newTokens = elapsed * this.refillRatePerMs;
        
        if (newTokens > 0) {
            this.tokens = Math.min(this.capacity, this.tokens + newTokens);
            this.lastRefill = now;
        }
    }
    
    getTokens(): number {
        this.refill();
        return this.tokens;
    }
}

/**
 * Circuit Breaker for Fault Tolerance (Finagle Pattern)
 */
class CircuitBreaker {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount: number = 0;
    private readonly threshold: number = 3;
    private readonly resetTimeout: number = 60000; // 1 minute
    private lastFailureTime: number = 0;

    public recordSuccess() {
        this.failureCount = 0;
        this.state = 'CLOSED';
    }

    public recordFailure() {
        this.failureCount++;
        this.lastFailureTime = Date.now();
        if (this.failureCount >= this.threshold) {
            this.state = 'OPEN';
            console.warn('Circuit Breaker TRIPPED: Entering OPEN state.');
        }
    }

    public isOpen(): boolean {
        if (this.state === 'OPEN') {
            const now = Date.now();
            if (now - this.lastFailureTime > this.resetTimeout) {
                this.state = 'HALF_OPEN';
                console.log('Circuit Breaker HALF_OPEN: Allowing probe request.');
                return false;
            }
            return true;
        }
        return false;
    }

    public getStatus(): CircuitBreakerStatus {
        return {
            state: this.state,
            failures: this.failureCount,
            lastFailure: this.lastFailureTime,
            nextRetry: this.state === 'OPEN' ? this.lastFailureTime + this.resetTimeout : undefined
        };
    }
}

/**
 * X API Automation Service for APEX System v7.4
 */
export class XAutomationService {
    private roClient: TwitterApiReadOnly;
    private rwClient?: TwitterApi;
    private config: AutomationConfig;
    private replyBucket: TokenBucket;
    private circuitBreaker: CircuitBreaker;
    private lastReplyTime = 0;

    constructor(credentials: XApiCredentials, config: AutomationConfig) {
        if (!credentials.bearerToken) {
            throw new Error("A Twitter API v2 Bearer Token is required for automation.");
        }
        this.roClient = new TwitterApi(credentials.bearerToken).readOnly;

        if (credentials.appKey && credentials.appSecret && credentials.accessToken && credentials.accessSecret) {
            try {
                this.rwClient = new TwitterApi({
                    appKey: credentials.appKey,
                    appSecret: credentials.appSecret,
                    accessToken: credentials.accessToken,
                    accessSecret: credentials.accessSecret,
                });
                console.log("Read-write X client initialized successfully.");
            } catch (err) {
                console.error("Failed to initialize read-write client:", err);
                throw new Error("Failed to initialize read-write client. Check your App Key/Secret and Access Token/Secret.");
            }
        } else {
             console.log("Read-only X client initialized. Full credentials needed for replies.");
        }

        this.config = config;
        // Initialize Token Bucket: Capacity = max per day, Refill rate = max per hour
        this.replyBucket = new TokenBucket(config.maxRepliesPerDay, config.maxRepliesPerHour * 60); // approx refill
        this.circuitBreaker = new CircuitBreaker();
    }

    async findCandidatePosts(criteria: PostSearchCriteria): Promise<PostCandidate[]> {
        try {
            // Check circuit breaker for search operations too, to save API quota
            if (this.circuitBreaker.isOpen()) {
                throw new Error("Circuit Breaker is OPEN. Requests halted temporarily.");
            }

            let searchQuery = (criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords.join(' OR ') : '(AI OR startup OR tech OR business)') + ' lang:en -is:retweet -is:reply';
            if (criteria.excludeKeywords && criteria.excludeKeywords.length > 0) {
                searchQuery += ' ' + criteria.excludeKeywords.map(k => `-${k}`).join(' ');
            }

            const searchResults = await this.roClient.v2.search(searchQuery, {
                max_results: 100,
                'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
                'user.fields': ['username', 'name', 'public_metrics', 'verified'],
                expansions: ['author_id']
            });

            this.circuitBreaker.recordSuccess(); // Successful read

            const candidates: PostCandidate[] = [];
            const users = searchResults.includes?.users || [];

            if (!searchResults.data.data) {
                return [];
            }

            for (const tweet of searchResults.data.data) {
                const author = users.find(user => user.id === tweet.author_id);
                if (!author) continue;

                const ageHours = (Date.now() - new Date(tweet.created_at!).getTime()) / 3600000;
                if (ageHours > criteria.maxAgeHours) continue;

                const metrics = tweet.public_metrics!;
                const authorMetrics = author.public_metrics!;
                
                if(this.config.blacklistedAccounts?.includes(author.username)) continue;
                if(criteria.authorFollowerMin && authorMetrics.followers_count < criteria.authorFollowerMin) continue;

                // Pass verified status for Premium user bonus calculation
                const isVerified = author.verified || false;
                const eligibilityScore = this.calculateEligibilityScore(metrics, authorMetrics, ageHours, isVerified);

                // Revenue-optimized threshold: prioritize higher scores
                if (eligibilityScore < 0.45) continue;

                candidates.push({
                    id: tweet.id,
                    text: tweet.text,
                    authorHandle: `@${author.username}`,
                    authorName: author.name,
                    createdAt: new Date(tweet.created_at!),
                    metrics: { views: metrics.impression_count || 0, likes: metrics.like_count, reposts: metrics.retweet_count, replies: metrics.reply_count },
                    eligibilityScore,
                    reasons: this.getEligibilityReasons(metrics, authorMetrics, eligibilityScore, isVerified)
                });
            }

            return candidates.sort((a, b) => b.eligibilityScore - a.eligibilityScore).slice(0, 20);
        } catch (error) {
            console.error('Error finding candidates:', error);
            this.circuitBreaker.recordFailure(); // Record failure

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            if (errorMessage.includes('401')) {
                 throw new Error(`Authentication Error: The provided Bearer Token is invalid or has been revoked.`);
            }
            throw new Error(`Failed to find candidate posts: ${errorMessage}`);
        }
    }

    /**
     * REVENUE-OPTIMIZED ELIGIBILITY SCORING v8.0
     * Based on X monetization model (post-November 2024):
     * - Revenue = engagement from Premium/verified users
     * - Premium+ interactions worth more than basic Premium
     * - Algorithm boosts: Reply-to-reply (75x), Profile click (12x), Dwell time (10x)
     */
    private calculateEligibilityScore(postMetrics: any, authorMetrics: any, ageHours: number, isVerified?: boolean): number {
        // Base engagement rate with 2024 algorithm weights
        // Reply-to-reply potential = reply_count * 75x weight (normalized)
        // Retweet = 20x, Like = 30x (but likes are easier, so lower revenue impact per unit)
        const replyWeight = 3; // High weight - replies lead to conversation chains (75x boost)
        const retweetWeight = 2; // Medium weight - exposure but not conversation
        const likeWeight = 0.5; // Lower weight - engagement but not revenue-optimal

        const weightedEngagement = (
            postMetrics.like_count * likeWeight +
            postMetrics.retweet_count * retweetWeight +
            postMetrics.reply_count * replyWeight
        ) / (authorMetrics.followers_count || 1);

        // Follower score with Premium user density estimate
        // Larger accounts tend to have more Premium followers in absolute numbers
        const followerScore = Math.log10(Math.max(authorMetrics.followers_count, 1)) / 7;

        // Recency bonus - fresher posts get more algorithm distribution
        const recencyBonus = Math.max(0, (12 - ageHours) / 12) * 0.25; // Tighter window for optimal timing

        // PREMIUM USER BONUS: Verified authors have Premium audiences
        // Their followers are 2-4x more likely to be Premium subscribers
        const verifiedBonus = isVerified ? 0.15 : 0;

        // Conversation potential bonus - low reply count = opportunity for visible reply
        const conversationOpportunity = postMetrics.reply_count < 50 ? 0.1 :
                                        postMetrics.reply_count < 100 ? 0.05 : 0;

        // High engagement rate indicates Premium-heavy audience (they engage more)
        const engagementRateBonus = weightedEngagement > 0.05 ? 0.1 : 0;

        return Math.min(weightedEngagement * 800, 0.35) +
               Math.min(followerScore, 0.25) +
               recencyBonus +
               verifiedBonus +
               conversationOpportunity +
               engagementRateBonus;
    }

    private getEligibilityReasons(postMetrics: any, authorMetrics: any, score: number, isVerified?: boolean): string[] {
        const reasons = [];
        // Revenue-focused eligibility reasons
        if (score > 0.7) reasons.push('High revenue potential');
        if (score > 0.6) reasons.push('Strong Premium audience signal');
        if (authorMetrics.followers_count > 100000) reasons.push('Large Premium audience pool');
        if (authorMetrics.followers_count > 500000) reasons.push('Mega-influencer (high Premium density)');
        if (postMetrics.reply_count < 20) reasons.push('Low competition - high visibility opportunity');
        if (postMetrics.reply_count < 50 && postMetrics.like_count > 100) reasons.push('Conversation chain potential (75x)');
        if (isVerified) reasons.push('Verified author (Premium audience 2-4x)');

        // Engagement rate analysis
        const engagementRate = (postMetrics.like_count + postMetrics.retweet_count + postMetrics.reply_count) / (authorMetrics.followers_count || 1);
        if (engagementRate > 0.05) reasons.push('High engagement rate (Premium-heavy audience)');
        if (engagementRate > 0.1) reasons.push('Viral potential (maximum revenue opportunity)');

        return reasons;
    }

    private canReply(): { allowed: boolean; reason?: string } {
        if (this.circuitBreaker.isOpen()) {
            return { allowed: false, reason: "Circuit Breaker is OPEN. System recovering." };
        }

        if (!this.rwClient) {
            return { allowed: false, reason: 'Full API credentials (App Key/Secret, Access Token/Secret) are required to send replies.' };
        }
        if (this.config.dryRun) {
            return { allowed: true, reason: 'Dry run is enabled. No reply will be sent.' };
        }
        
        // Check Token Bucket
        if (!this.replyBucket.tryConsume(1)) {
             return { allowed: false, reason: 'Rate Limit Reached (Token Bucket Empty). Wait for refill.' };
        }

        const timeSinceLastReply = Date.now() - this.lastReplyTime;
        if (timeSinceLastReply < this.config.cooldownBetweenReplies * 60 * 1000) {
            const waitTime = (this.config.cooldownBetweenReplies * 60 * 1000 - timeSinceLastReply) / 1000;
            return { allowed: false, reason: `Cooldown active. Please wait ${Math.ceil(waitTime)}s.` };
        }
        return { allowed: true };
    }

    async generateAndReply(post: PostCandidate): Promise<AutomationResult> {
        const canReplyCheck = this.canReply();
        if (!canReplyCheck.allowed && !this.config.dryRun) { 
            return { success: false, error: canReplyCheck.reason, timestamp: new Date() };
        }

        const startTime = Date.now();
        try {
            const { strategies } = await generateReplies(post.text, post.authorHandle, { useCache: false, temperature: 0.4 });
            if (!strategies || strategies.length === 0) {
                return { success: false, error: 'No suitable reply strategies generated.', timestamp: new Date() };
            }

            // REVENUE-OPTIMIZED STRATEGY SELECTION v8.0
            // Prioritize: revenueImpactScore > conversationChainPotential > algorithmScore
            const bestStrategy = strategies.sort((a, b) => {
                // Primary: Revenue impact score (composite monetization potential)
                const revenueA = a.scores.revenueImpactScore || a.scores.algorithmScore;
                const revenueB = b.scores.revenueImpactScore || b.scores.algorithmScore;

                // Secondary: Conversation chain potential (75x algorithm boost)
                const convChainA = a.scores.conversationChainPotential || 0;
                const convChainB = b.scores.conversationChainPotential || 0;

                // Weighted composite: 60% revenue, 30% conversation chain, 10% base algorithm
                const compositeA = (revenueA * 0.6) + (convChainA * 0.3) + (a.scores.algorithmScore * 0.1);
                const compositeB = (revenueB * 0.6) + (convChainB * 0.3) + (b.scores.algorithmScore * 0.1);

                return compositeB - compositeA;
            })[0];

            // Use revenueImpactScore for confidence check, fallback to algorithmScore
            const effectiveScore = bestStrategy.scores.revenueImpactScore || bestStrategy.scores.algorithmScore;
            if (effectiveScore < this.config.safetyChecks.minimumConfidenceScore) {
                 return {
                    success: false,
                    error: `Strategy score (${bestStrategy.scores.algorithmScore}) is below minimum confidence (${this.config.safetyChecks.minimumConfidenceScore}).`,
                    timestamp: new Date(),
                    strategy: bestStrategy
                };
            }
            
            if (this.config.dryRun || !this.rwClient) {
                console.log(`[DRY RUN] Would reply to post ${post.id} with: "${bestStrategy.replyText}"`);
                 return {
                    success: true,
                    postId: post.id,
                    strategy: bestStrategy,
                    timestamp: new Date(),
                    metrics: { processingTime: Date.now() - startTime, confidenceScore: bestStrategy.scores.algorithmScore }
                };
            }

            const replyResult = await this.rwClient.v2.reply(bestStrategy.replyText, post.id);
            
            // If we reach here, the API call succeeded. Reset circuit breaker.
            this.circuitBreaker.recordSuccess();
            this.lastReplyTime = Date.now();

            return {
                success: true,
                postId: post.id,
                replyId: replyResult.data.id,
                strategy: bestStrategy,
                timestamp: new Date(),
                metrics: { processingTime: Date.now() - startTime, confidenceScore: bestStrategy.scores.algorithmScore }
            };

        } catch (error) {
            console.error(`Error generating/replying to post ${post.id}:`, error);
            // API failure, record it in circuit breaker
            this.circuitBreaker.recordFailure();

            let errorMessage = 'An unknown error occurred during the reply process.';

            if (typeof error === 'object' && error !== null && 'data' in error) {
                const apiError = error as any;
                const statusCode = apiError.code;
                const errorDetail = apiError.data?.detail || 'No details provided.';
                const errorTitle = apiError.data?.title || 'API Error';

                switch (statusCode) {
                    case 400:
                        errorMessage = `Bad Request (400): The reply content may be invalid. Detail: ${errorDetail}`;
                        break;
                    case 401:
                        errorMessage = `Unauthorized (401): Your API keys are invalid or have been revoked.`;
                        break;
                    case 403:
                        errorMessage = `Forbidden (403): Permission issue. Detail: ${errorDetail}`;
                        break;
                    case 429:
                        errorMessage = `Rate Limit Exceeded (429): X API Limit reached. Title: ${errorTitle}`;
                        break;
                    default:
                        errorMessage = `X API Error (${statusCode} ${errorTitle}): ${errorDetail}`;
                }
            } else if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            return { success: false, error: errorMessage, timestamp: new Date() };
        }
    }

    async runAutomation(criteria: PostSearchCriteria): Promise<AutomationResult[]> {
        if (!this.config.enabled) {
            return [{ success: false, error: 'Automation is disabled in settings.', timestamp: new Date() }];
        }
        
        const canReplyCheck = this.canReply();
        if (!canReplyCheck.allowed && !this.config.dryRun) {
             return [{ success: false, error: canReplyCheck.reason, timestamp: new Date() }];
        }

        const candidates = await this.findCandidatePosts(criteria);
        if (candidates.length === 0) {
            return [{ success: false, error: 'No eligible candidate posts found.', timestamp: new Date() }];
        }

        const candidateToProcess = candidates[0]; 
        console.log(`Processing best candidate: ${candidateToProcess.id} by ${candidateToProcess.authorHandle}`);
        const result = await this.generateAndReply(candidateToProcess);
        
        return [result];
    }

    getStatus() {
        return {
            enabled: this.config.enabled,
            dryRun: this.config.dryRun,
            tokenBucket: {
                tokens: Math.floor(this.replyBucket.getTokens()),
                capacity: this.config.maxRepliesPerDay
            },
            cooldown: {
                timeUntilNext: Math.max(0, (this.lastReplyTime + this.config.cooldownBetweenReplies * 60 * 1000) - Date.now())
            },
            circuitBreaker: this.circuitBreaker.getStatus()
        };
    }

    updateConfig(newConfig: Partial<AutomationConfig>) {
        this.config = { ...this.config, ...newConfig };
        // Re-init bucket if limits change
        if(newConfig.maxRepliesPerDay || newConfig.maxRepliesPerHour) {
            this.replyBucket = new TokenBucket(this.config.maxRepliesPerDay, this.config.maxRepliesPerHour * 60);
        }
        console.log('Automation config updated');
    }
}


export function createXAutomationService(credentials: XApiCredentials, config: AutomationConfig): XAutomationService {
    return new XAutomationService(credentials, config);
}

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
    enabled: false,
    maxRepliesPerHour: 5,
    maxRepliesPerDay: 20,
    cooldownBetweenReplies: 15,
    dryRun: true,
    safetyChecks: {
        requireManualApproval: false,
        minimumConfidenceScore: 80,
        maximumRiskLevel: 'medium'
    }
};

/**
 * REVENUE-OPTIMIZED SEARCH CRITERIA v8.0
 * Targets topics and accounts with highest Premium user density
 * Based on X monetization research: Tech, Finance, AI, Crypto have highest Premium concentration
 */
export const DEFAULT_SEARCH_CRITERIA: PostSearchCriteria = {
    minViews: 50000, // Lower threshold to catch rising content early (first-mover advantage)
    maxAgeHours: 8, // Tighter window for optimal algorithm distribution
    // HIGH PREMIUM DENSITY TOPICS (SimClusters with verified high Premium user concentration)
    keywords: [
        // Tier S: Highest Premium density
        'AI', 'GPT', 'LLM', 'artificial intelligence', 'machine learning',
        'startup', 'founder', 'venture capital', 'Series A', 'YC',
        'crypto', 'bitcoin', 'ethereum', 'web3', 'DeFi',
        // Tier A: High Premium density
        'SaaS', 'B2B', 'tech', 'software', 'developer',
        'investing', 'finance', 'trading', 'markets',
        // Tier B: Good Premium density
        'entrepreneur', 'business', 'growth', 'product', 'innovation'
    ],
    excludeKeywords: [
        'politics', 'spam', 'giveaway', 'follow back', 'RT to win',
        'hate', 'controversial', 'breaking news', 'NSFW'
    ],
    authorFollowerMin: 25000, // Higher threshold = more Premium followers in absolute numbers
    // NEW v8.0: Revenue optimization flags
    prioritizeVerifiedAuthors: true,
    revenueOptimized: true,
    targetSimClusters: ['Tech Twitter', 'FinTwit', 'Crypto Twitter', 'AI/ML', 'Startup']
};
