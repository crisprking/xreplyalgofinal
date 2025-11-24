
import { generateReplies } from './geminiService';
import { searchPosts, postReply, checkServerHealth } from './api-client';
import {
    type XApiCredentials,
    type PostSearchCriteria,
    type AutomationConfig,
    type PostCandidate,
    type AutomationResult,
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
 * Now uses backend API for all X/Twitter operations
 */
export class XAutomationService {
    private credentials: XApiCredentials;
    private config: AutomationConfig;
    private replyBucket: TokenBucket;
    private circuitBreaker: CircuitBreaker;
    private lastReplyTime = 0;
    private serverHealthy = false;

    constructor(credentials: XApiCredentials, config: AutomationConfig) {
        if (!credentials.bearerToken) {
            throw new Error("A Twitter API v2 Bearer Token is required for automation.");
        }
        this.credentials = credentials;
        this.config = config;
        this.replyBucket = new TokenBucket(config.maxRepliesPerDay, config.maxRepliesPerHour * 60);
        this.circuitBreaker = new CircuitBreaker();

        // Check server health on init
        this.checkServer();
    }

    private async checkServer(): Promise<void> {
        this.serverHealthy = await checkServerHealth();
        if (!this.serverHealthy) {
            console.warn('Backend server is not reachable. Make sure to run: npm run dev:server');
        }
    }

    async findCandidatePosts(criteria: PostSearchCriteria): Promise<PostCandidate[]> {
        try {
            if (this.circuitBreaker.isOpen()) {
                throw new Error("Circuit Breaker is OPEN. Requests halted temporarily.");
            }

            // Check server health first
            if (!this.serverHealthy) {
                await this.checkServer();
                if (!this.serverHealthy) {
                    throw new Error("Backend server is not running. Start it with: npm run dev:server");
                }
            }

            console.log(`[Automation] Searching for posts with ${criteria.minViews}+ views...`);

            const candidates = await searchPosts(this.credentials.bearerToken, {
                minViews: criteria.minViews,
                maxAgeHours: criteria.maxAgeHours,
                keywords: criteria.keywords,
                excludeKeywords: criteria.excludeKeywords,
                authorFollowerMin: criteria.authorFollowerMin
            });

            this.circuitBreaker.recordSuccess();

            // Filter by blacklisted accounts on client side
            const filteredCandidates = candidates.filter(
                c => !this.config.blacklistedAccounts?.includes(c.authorHandle.replace('@', ''))
            );

            console.log(`[Automation] Found ${filteredCandidates.length} eligible candidates`);
            return filteredCandidates;

        } catch (error) {
            console.error('Error finding candidates:', error);
            this.circuitBreaker.recordFailure();

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            throw new Error(`Failed to find candidates: ${errorMessage}`);
        }
    }

    private canReply(): { allowed: boolean; reason?: string } {
        if (this.circuitBreaker.isOpen()) {
            return { allowed: false, reason: "Circuit Breaker is OPEN. System recovering." };
        }

        const hasFullCredentials = this.credentials.appKey &&
                                   this.credentials.appSecret &&
                                   this.credentials.accessToken &&
                                   this.credentials.accessSecret;

        if (!hasFullCredentials) {
            return { allowed: false, reason: 'Full API credentials (App Key/Secret, Access Token/Secret) are required to send replies.' };
        }

        if (this.config.dryRun) {
            return { allowed: true, reason: 'Dry run is enabled. No reply will be sent.' };
        }

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
            console.log(`[Automation] Generating reply for post by ${post.authorHandle}...`);

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

            if (this.config.dryRun) {
                console.log(`[DRY RUN] Would reply to post ${post.id} with: "${bestStrategy.replyText}"`);
                return {
                    success: true,
                    postId: post.id,
                    strategy: bestStrategy,
                    timestamp: new Date(),
                    metrics: { processingTime: Date.now() - startTime, confidenceScore: bestStrategy.scores.algorithmScore }
                };
            }

            // Actually post the reply through the backend
            console.log(`[Automation] Posting reply to ${post.id}...`);
            const result = await postReply(this.credentials, post.id, bestStrategy.replyText);

            this.circuitBreaker.recordSuccess();
            this.lastReplyTime = Date.now();

            return {
                success: true,
                postId: post.id,
                replyId: result.replyId,
                strategy: bestStrategy,
                timestamp: new Date(),
                metrics: { processingTime: Date.now() - startTime, confidenceScore: bestStrategy.scores.algorithmScore }
            };

        } catch (error) {
            console.error(`Error generating/replying to post ${post.id}:`, error);
            this.circuitBreaker.recordFailure();

            const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred during the reply process.';
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
            return [{ success: false, error: 'No eligible candidate posts found matching criteria.', timestamp: new Date() }];
        }

        const candidateToProcess = candidates[0];
        console.log(`[Automation] Processing best candidate: ${candidateToProcess.id} by ${candidateToProcess.authorHandle}`);
        const result = await this.generateAndReply(candidateToProcess);

        return [result];
    }

    getStatus() {
        return {
            enabled: this.config.enabled,
            dryRun: this.config.dryRun,
            serverHealthy: this.serverHealthy,
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
        if (newConfig.maxRepliesPerDay || newConfig.maxRepliesPerHour) {
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
    minViews: 1000000, // 1 million views minimum for viral posts
    maxAgeHours: 24,   // Extended to 24 hours to find more viral posts
    keywords: ['AI', 'startup', 'tech', 'innovation', 'business', 'SaaS'],
    excludeKeywords: ['politics', 'spam'],
    authorFollowerMin: 10000
};
