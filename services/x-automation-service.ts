
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
 * HIGH-PREMIUM-DENSITY NICHE KEYWORDS
 * These keywords help identify posts in niches with high Premium user concentration
 */
const NICHE_KEYWORDS: Record<string, string[]> = {
    tech: ['AI', 'startup', 'SaaS', 'software', 'developer', 'engineering', 'tech', 'programming', 'code', 'API', 'cloud', 'DevOps', 'machine learning', 'GPT', 'LLM', 'founder', 'YC', 'Series A', 'product'],
    finance: ['investing', 'stocks', 'portfolio', 'market', 'trading', 'hedge fund', 'PE', 'VC', 'valuation', 'IPO', 'earnings', 'dividend', 'returns', 'alpha', 'fund'],
    crypto: ['crypto', 'bitcoin', 'ethereum', 'defi', 'NFT', 'web3', 'blockchain', 'token', 'wallet', 'protocol', 'solana', 'BTC', 'ETH'],
    business: ['business', 'CEO', 'leadership', 'strategy', 'growth', 'revenue', 'scaling', 'enterprise', 'B2B', 'acquisition', 'management', 'executive'],
    creator: ['creator economy', 'content', 'audience', 'subscribers', 'monetization', 'newsletter', 'course', 'community', 'personal brand']
};

/**
 * Detect the niche of a post based on content keywords
 */
function detectNiche(text: string): 'tech' | 'finance' | 'crypto' | 'business' | 'creator' | 'politics' | 'entertainment' | 'other' {
    const lowerText = text.toLowerCase();
    const scores: Record<string, number> = { tech: 0, finance: 0, crypto: 0, business: 0, creator: 0 };

    for (const [niche, keywords] of Object.entries(NICHE_KEYWORDS)) {
        for (const keyword of keywords) {
            if (lowerText.includes(keyword.toLowerCase())) {
                scores[niche] += 1;
            }
        }
    }

    const maxNiche = Object.entries(scores).reduce((a, b) => a[1] > b[1] ? a : b);
    if (maxNiche[1] >= 2) return maxNiche[0] as any;
    if (maxNiche[1] === 1) return maxNiche[0] as any;
    return 'other';
}

/**
 * Estimate Premium audience ratio based on author characteristics
 */
function estimatePremiumAudienceRatio(
    followerCount: number,
    isVerified: boolean,
    niche: string
): number {
    // Base ratio: ~2-3% of X users are Premium
    let ratio = 0.025;

    // Verified authors have audiences with higher Premium ratios
    if (isVerified) ratio += 0.05;

    // High-follower accounts in premium niches have better Premium ratios
    if (followerCount > 100000) ratio += 0.03;
    else if (followerCount > 50000) ratio += 0.02;
    else if (followerCount > 10000) ratio += 0.01;

    // Niche multipliers
    const nicheMultipliers: Record<string, number> = {
        tech: 2.5,
        finance: 2.3,
        crypto: 2.2,
        business: 2.0,
        creator: 1.8,
        politics: 1.2,
        entertainment: 0.8,
        other: 1.0
    };

    ratio *= nicheMultipliers[niche] || 1.0;

    return Math.min(ratio, 0.25); // Cap at 25%
}

/**
 * Calculate monetization potential (0-100) for a post
 */
function calculateMonetizationPotential(
    isVerified: boolean,
    followerCount: number,
    niche: string,
    replyCount: number,
    engagementRate: number
): number {
    let score = 0;

    // Verified author = +30 points (their audience is Premium-rich)
    if (isVerified) score += 30;

    // Niche scoring (high-Premium niches)
    const nicheScores: Record<string, number> = {
        tech: 25, finance: 23, crypto: 22, business: 20,
        creator: 15, politics: 5, entertainment: 3, other: 5
    };
    score += nicheScores[niche] || 5;

    // Follower count scoring (sweet spot: 10k-500k)
    if (followerCount >= 50000 && followerCount <= 500000) score += 20;
    else if (followerCount >= 10000 && followerCount < 50000) score += 15;
    else if (followerCount > 500000) score += 12; // Very large accounts = diluted attention
    else score += 5;

    // Low reply competition = high visibility for your reply
    if (replyCount < 10) score += 15;
    else if (replyCount < 25) score += 10;
    else if (replyCount < 50) score += 5;

    // High engagement rate = active Premium audience
    if (engagementRate > 0.05) score += 10;
    else if (engagementRate > 0.02) score += 5;

    return Math.min(score, 100);
}

/**
 * X API Automation Service for APEX System v7.5 (Monetization-Optimized)
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

            // Build search query optimized for monetization
            let searchQuery = (criteria.keywords && criteria.keywords.length > 0 ? criteria.keywords.join(' OR ') : '(AI OR startup OR tech OR SaaS OR founder OR VC OR investing)') + ' lang:en -is:retweet -is:reply';
            if (criteria.excludeKeywords && criteria.excludeKeywords.length > 0) {
                searchQuery += ' ' + criteria.excludeKeywords.map(k => `-${k}`).join(' ');
            }

            const searchResults = await this.roClient.v2.search(searchQuery, {
                max_results: 100,
                'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
                'user.fields': ['username', 'name', 'public_metrics', 'verified', 'verified_type'],
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

                // ★ NEW v7.5: Detect if author is verified (Premium subscriber)
                const isVerified = !!(author as any).verified || !!(author as any).verified_type;

                // ★ NEW v7.5: Skip non-verified if requireVerifiedAuthor is set
                if (criteria.requireVerifiedAuthor && !isVerified) continue;

                // ★ NEW v7.5: Apply max reply count filter (avoid buried replies)
                if (criteria.maxReplyCount && metrics.reply_count > criteria.maxReplyCount) continue;

                // ★ NEW v7.5: Detect niche for Premium density estimation
                const niche = detectNiche(tweet.text);

                // ★ NEW v7.5: Filter by target niches if specified
                if (criteria.targetNiches && criteria.targetNiches.length > 0) {
                    if (!criteria.targetNiches.includes(niche as any) && niche !== 'other') continue;
                }

                // ★ NEW v7.5: Calculate engagement rate for filtering
                const engagementRate = (metrics.like_count + metrics.retweet_count) / (authorMetrics.followers_count || 1);
                if (criteria.minEngagementRate && engagementRate < criteria.minEngagementRate) continue;

                // ★ NEW v7.5: Enhanced eligibility score with monetization factors
                const eligibilityScore = this.calculateEligibilityScore(
                    metrics, authorMetrics, ageHours, isVerified, niche
                );

                // ★ NEW v7.5: Lower threshold but prioritize by monetization potential
                if (eligibilityScore < 0.35) continue;

                // ★ NEW v7.5: Calculate monetization-specific metrics
                const premiumAudienceRatio = estimatePremiumAudienceRatio(
                    authorMetrics.followers_count, isVerified, niche
                );
                const monetizationPotential = calculateMonetizationPotential(
                    isVerified, authorMetrics.followers_count, niche,
                    metrics.reply_count, engagementRate
                );
                const premiumEngagementLikelihood = Math.min(
                    premiumAudienceRatio * (isVerified ? 1.5 : 1.0) * (engagementRate > 0.03 ? 1.3 : 1.0),
                    0.5
                );

                candidates.push({
                    id: tweet.id,
                    text: tweet.text,
                    authorHandle: `@${author.username}`,
                    authorName: author.name,
                    createdAt: new Date(tweet.created_at!),
                    metrics: { views: metrics.impression_count || 0, likes: metrics.like_count, reposts: metrics.retweet_count, replies: metrics.reply_count },
                    eligibilityScore,
                    reasons: this.getEligibilityReasons(metrics, authorMetrics, eligibilityScore, isVerified, niche, monetizationPotential),
                    // ★ NEW v7.5: Monetization tracking fields
                    authorIsVerified: isVerified,
                    authorFollowerCount: authorMetrics.followers_count,
                    estimatedPremiumAudienceRatio: premiumAudienceRatio,
                    monetizationPotential,
                    premiumEngagementLikelihood,
                    niche: niche as any
                });
            }

            // ★ NEW v7.5: Sort by monetization potential, then eligibility score
            return candidates
                .sort((a, b) => {
                    // Primary: monetization potential (weight: 60%)
                    // Secondary: eligibility score (weight: 40%)
                    const aScore = (a.monetizationPotential / 100 * 0.6) + (a.eligibilityScore * 0.4);
                    const bScore = (b.monetizationPotential / 100 * 0.6) + (b.eligibilityScore * 0.4);
                    return bScore - aScore;
                })
                .slice(0, 20);
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
     * MONETIZATION-OPTIMIZED ELIGIBILITY SCORING v7.5
     *
     * X's monetization (as of Nov 2024) pays based on PREMIUM USER ENGAGEMENT ONLY.
     * This scoring system prioritizes posts that maximize Premium user interaction potential.
     *
     * Key factors:
     * 1. Verified author = Premium subscriber = their audience has higher Premium density
     * 2. Tech/finance/business niches have 3-5x higher Premium user ratios
     * 3. Lower reply count = your reply gets more visibility
     * 4. Higher engagement rate = more active (likely Premium) audience
     * 5. Optimal timing (business hours) = more Premium users online
     */
    private calculateEligibilityScore(
        postMetrics: any,
        authorMetrics: any,
        ageHours: number,
        isVerified: boolean = false,
        detectedNiche: string = 'other'
    ): number {
        // Base engagement rate (likes weighted 30x, retweets 20x per X's algorithm)
        const weightedEngagement = (postMetrics.like_count * 30 + postMetrics.retweet_count * 20 + postMetrics.reply_count) / (authorMetrics.followers_count || 1);
        const engagementScore = Math.min(weightedEngagement * 100, 0.25);

        // Follower score with diminishing returns
        const followerScore = Math.min(Math.log10(Math.max(authorMetrics.followers_count, 1)) / 7, 0.15);

        // Recency bonus (fresher posts = better reply visibility)
        const recencyBonus = Math.max(0, (12 - ageHours) / 12) * 0.15;

        // ★ VERIFIED/PREMIUM AUTHOR BONUS (CRITICAL FOR MONETIZATION)
        // Verified accounts = Premium subscribers = their audience is 3-5x more likely to be Premium
        const verifiedBonus = isVerified ? 0.25 : 0;

        // ★ NICHE PREMIUM DENSITY MULTIPLIER
        // These niches have significantly higher Premium user ratios
        const nichePremiumMultipliers: Record<string, number> = {
            'tech': 0.15,      // Tech Twitter has highest Premium density
            'finance': 0.14,   // Finance/investing crowd pays for Premium
            'crypto': 0.13,    // Crypto users are heavy Premium adopters
            'business': 0.12,  // Business/entrepreneur space
            'creator': 0.10,   // Creator economy folks
            'politics': 0.05,  // Lower monetization potential
            'entertainment': 0.03,
            'other': 0.02
        };
        const nicheBonus = nichePremiumMultipliers[detectedNiche] || 0.02;

        // ★ LOW REPLY COMPETITION BONUS
        // Fewer replies = your reply is more visible = more engagement potential
        const replyCount = postMetrics.reply_count || 0;
        let competitionBonus = 0;
        if (replyCount < 10) competitionBonus = 0.12;       // Goldmine: early to the conversation
        else if (replyCount < 25) competitionBonus = 0.08;  // Good: still visible
        else if (replyCount < 50) competitionBonus = 0.04;  // Decent
        else if (replyCount < 100) competitionBonus = 0.02; // Crowded
        // 100+ replies = 0 bonus (your reply will get buried)

        // ★ HIGH ENGAGEMENT SIGNALS ACTIVE PREMIUM AUDIENCE
        const engagementRateRaw = (postMetrics.like_count + postMetrics.retweet_count) / (authorMetrics.followers_count || 1);
        const activeAudienceBonus = engagementRateRaw > 0.05 ? 0.08 : (engagementRateRaw > 0.02 ? 0.04 : 0);

        // ★ OPTIMAL TIMING BONUS (Premium users most active during business hours)
        const currentHour = new Date().getUTCHours();
        const isPremiumPeakHours = (currentHour >= 13 && currentHour <= 22); // 9AM-6PM EST = 13-22 UTC
        const timingBonus = isPremiumPeakHours ? 0.05 : 0;

        const totalScore = engagementScore + followerScore + recencyBonus +
                          verifiedBonus + nicheBonus + competitionBonus +
                          activeAudienceBonus + timingBonus;

        return Math.min(totalScore, 1.0); // Cap at 1.0
    }

    private getEligibilityReasons(
        postMetrics: any,
        authorMetrics: any,
        score: number,
        isVerified: boolean = false,
        niche: string = 'other',
        monetizationPotential: number = 0
    ): string[] {
        const reasons: string[] = [];

        // ★ MONETIZATION-FOCUSED REASONS (v7.5)
        if (isVerified) reasons.push('✓ Verified author (Premium audience)');
        if (monetizationPotential >= 70) reasons.push('💰 High monetization potential');
        else if (monetizationPotential >= 50) reasons.push('💵 Good monetization potential');

        if (['tech', 'finance', 'crypto', 'business'].includes(niche)) {
            reasons.push(`🎯 Premium-rich niche: ${niche}`);
        }

        if (postMetrics.reply_count < 10) reasons.push('🥇 Very low competition (early reply)');
        else if (postMetrics.reply_count < 25) reasons.push('🥈 Low competition');

        if (score > 0.7) reasons.push('📈 High engagement rate');
        if (authorMetrics.followers_count > 100000) reasons.push('⭐ Influential author (100k+)');
        else if (authorMetrics.followers_count > 50000) reasons.push('📊 Mid-tier influencer (50k+)');

        const engagementRate = (postMetrics.like_count + postMetrics.retweet_count) / (authorMetrics.followers_count || 1);
        if (engagementRate > 0.05) reasons.push('🔥 Viral engagement (5%+ rate)');
        else if (engagementRate > 0.02) reasons.push('📊 Strong engagement (2%+ rate)');

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

            // ★ v7.5: Sort by MONETIZATION SCORE (primary), algorithm score (secondary)
            // This prioritizes replies that will generate the most revenue
            const bestStrategy = strategies.sort((a, b) => {
                const aMonetization = a.scores.monetizationScore || 0;
                const bMonetization = b.scores.monetizationScore || 0;
                // 70% weight on monetization, 30% on algorithm score
                const aTotal = (aMonetization * 0.7) + (a.scores.algorithmScore * 0.3);
                const bTotal = (bMonetization * 0.7) + (b.scores.algorithmScore * 0.3);
                return bTotal - aTotal;
            })[0];

            // Use monetizationScore for confidence check (or fall back to algorithmScore)
            const effectiveScore = bestStrategy.scores.monetizationScore || bestStrategy.scores.algorithmScore;

            if (effectiveScore < this.config.safetyChecks.minimumConfidenceScore) {
                 return {
                    success: false,
                    error: `Strategy monetization score (${effectiveScore}) is below minimum confidence (${this.config.safetyChecks.minimumConfidenceScore}).`,
                    timestamp: new Date(),
                    strategy: bestStrategy
                };
            }

            if (this.config.dryRun || !this.rwClient) {
                console.log(`[DRY RUN] Would reply to post ${post.id} with: "${bestStrategy.replyText}"`);
                console.log(`[DRY RUN] Monetization Score: ${bestStrategy.scores.monetizationScore}, Premium Potential: ${bestStrategy.scores.premiumEngagementPotential}`);
                 return {
                    success: true,
                    postId: post.id,
                    strategy: bestStrategy,
                    timestamp: new Date(),
                    metrics: { processingTime: Date.now() - startTime, confidenceScore: effectiveScore }
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
                metrics: { processingTime: Date.now() - startTime, confidenceScore: effectiveScore }
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
 * MONETIZATION-OPTIMIZED DEFAULT SEARCH CRITERIA v7.5
 *
 * Key changes from v7.4:
 * - Keywords optimized for high-Premium-density niches (tech, finance, business)
 * - Lower minViews threshold to catch posts early (less reply competition)
 * - maxReplyCount to avoid getting buried in crowded threads
 * - prioritizeVerified to boost Premium-audience posts
 * - Shorter maxAgeHours to catch viral posts early
 */
export const DEFAULT_SEARCH_CRITERIA: PostSearchCriteria = {
    minViews: 50000,           // Lower threshold to catch posts early
    maxAgeHours: 6,            // Shorter window = less reply competition
    keywords: [
        // Tech (highest Premium density)
        'AI', 'startup', 'SaaS', 'founder', 'YC', 'Series A', 'GPT', 'LLM',
        // Finance (very high Premium density)
        'investing', 'portfolio', 'VC', 'fundraising',
        // Business (high Premium density)
        'CEO', 'scaling', 'growth', 'revenue',
        // Crypto (high Premium density)
        'crypto', 'web3', 'bitcoin', 'ethereum'
    ],
    excludeKeywords: ['politics', 'spam', 'giveaway', 'follow for follow', 'DM me'],
    authorFollowerMin: 10000,
    // ★ NEW v7.5 monetization settings
    prioritizeVerified: true,      // Boost verified authors (Premium audiences)
    preferLowReplyCount: true,     // Prefer posts with fewer replies
    maxReplyCount: 50,             // Avoid posts where replies get buried
    targetNiches: ['tech', 'finance', 'crypto', 'business', 'creator']
};
