
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

                const eligibilityScore = this.calculateEligibilityScore(metrics, authorMetrics, ageHours);
                if (eligibilityScore < 0.5) continue;

                candidates.push({
                    id: tweet.id,
                    text: tweet.text,
                    authorHandle: `@${author.username}`,
                    authorName: author.name,
                    createdAt: new Date(tweet.created_at!),
                    metrics: { views: metrics.impression_count || 0, likes: metrics.like_count, reposts: metrics.retweet_count, replies: metrics.reply_count },
                    eligibilityScore,
                    reasons: this.getEligibilityReasons(metrics, authorMetrics, eligibilityScore)
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

    private calculateEligibilityScore(postMetrics: any, authorMetrics: any, ageHours: number): number {
        const engagementRate = (postMetrics.like_count + postMetrics.retweet_count * 2 + postMetrics.reply_count * 3) / (authorMetrics.followers_count || 1);
        const followerScore = Math.log10(Math.max(authorMetrics.followers_count, 1)) / 8;
        const recencyBonus = Math.max(0, (24 - ageHours) / 24) * 0.2;
        return Math.min(engagementRate * 1000, 0.4) + Math.min(followerScore, 0.3) + recencyBonus;
    }

    private getEligibilityReasons(postMetrics: any, authorMetrics: any, score: number): string[] {
        const reasons = [];
        if (score > 0.7) reasons.push('High engagement');
        if (authorMetrics.followers_count > 100000) reasons.push('Influential author');
        if (postMetrics.reply_count < 20) reasons.push('Low reply competition');
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

            const bestStrategy = strategies.sort((a, b) => b.scores.algorithmScore - a.scores.algorithmScore)[0];

            if (bestStrategy.scores.algorithmScore < this.config.safetyChecks.minimumConfidenceScore) {
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

export const DEFAULT_SEARCH_CRITERIA: PostSearchCriteria = {
    minViews: 100000,
    maxAgeHours: 12,
    keywords: ['AI', 'startup', 'tech', 'innovation', 'business', 'SaaS'],
    excludeKeywords: ['politics', 'spam'],
    authorFollowerMin: 10000
};
