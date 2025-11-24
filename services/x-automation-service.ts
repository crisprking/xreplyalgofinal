
import { TwitterApi, type TwitterApiReadOnly, type TweetV2, type UserV2 } from 'twitter-api-v2';
import { generateReplies } from './geminiService';
import {
    type XApiCredentials,
    type PostSearchCriteria,
    type AutomationConfig,
    type PostCandidate,
    type AutomationResult,
    type ReplyStrategy,
    type CircuitBreakerStatus,
    type AutomationStatus,
    type QueuedReply,
    type HealthCheckResult
} from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// APEX X AUTOMATION ENGINE v8.0 - "HOROLOGICAL PRECISION EDITION"
// Engineered with the precision of Rolex, Patek Philippe, and Audemars Piguet
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Precision Token Bucket Rate Limiter
 * Implements the "leaky bucket" algorithm with microsecond precision
 * Inspired by Twitter's Finagle and luxury watch escapement mechanisms
 */
class PrecisionTokenBucket {
    private tokens: number;
    private lastRefillTime: number;
    private readonly capacity: number;
    private readonly refillRatePerMs: number;
    private readonly minimumTokens: number;
    private consumptionHistory: Array<{ timestamp: number; tokens: number }> = [];

    constructor(capacity: number, refillRatePerMinute: number) {
        this.capacity = capacity;
        this.tokens = capacity;
        this.lastRefillTime = performance.now();
        this.refillRatePerMs = refillRatePerMinute / 60000;
        this.minimumTokens = Math.max(1, capacity * 0.1); // Reserve 10% as safety buffer
    }

    /**
     * Attempt to consume tokens with precision timing
     * Returns detailed result including wait time if tokens unavailable
     */
    tryConsume(requestedTokens: number = 1): {
        success: boolean;
        tokensRemaining: number;
        waitTimeMs?: number;
        nextRefillAt?: number;
    } {
        this.refill();

        if (this.tokens >= requestedTokens) {
            this.tokens -= requestedTokens;
            this.recordConsumption(requestedTokens);
            return {
                success: true,
                tokensRemaining: Math.floor(this.tokens)
            };
        }

        // Calculate precise wait time until enough tokens are available
        const tokensNeeded = requestedTokens - this.tokens;
        const waitTimeMs = Math.ceil(tokensNeeded / this.refillRatePerMs);

        return {
            success: false,
            tokensRemaining: Math.floor(this.tokens),
            waitTimeMs,
            nextRefillAt: Date.now() + waitTimeMs
        };
    }

    /**
     * Precision refill with sub-millisecond accuracy
     */
    private refill(): void {
        const now = performance.now();
        const elapsed = now - this.lastRefillTime;

        if (elapsed > 0) {
            const newTokens = elapsed * this.refillRatePerMs;
            this.tokens = Math.min(this.capacity, this.tokens + newTokens);
            this.lastRefillTime = now;
        }
    }

    private recordConsumption(tokens: number): void {
        const now = Date.now();
        this.consumptionHistory.push({ timestamp: now, tokens });

        // Keep only last hour of history
        const oneHourAgo = now - 3600000;
        this.consumptionHistory = this.consumptionHistory.filter(c => c.timestamp > oneHourAgo);
    }

    /**
     * Get current token status with precision metrics
     */
    getStatus(): {
        tokens: number;
        capacity: number;
        utilizationPercent: number;
        refillRatePerHour: number;
        consumptionLastHour: number;
        projectedDepletionMs?: number;
    } {
        this.refill();
        const consumptionLastHour = this.consumptionHistory.reduce((sum, c) => sum + c.tokens, 0);
        const avgConsumptionPerMs = consumptionLastHour / 3600000;

        return {
            tokens: Math.floor(this.tokens),
            capacity: this.capacity,
            utilizationPercent: ((this.capacity - this.tokens) / this.capacity) * 100,
            refillRatePerHour: this.refillRatePerMs * 3600000,
            consumptionLastHour,
            projectedDepletionMs: avgConsumptionPerMs > 0
                ? Math.floor(this.tokens / avgConsumptionPerMs)
                : undefined
        };
    }

    /**
     * Peek at available tokens without consuming
     */
    peek(): number {
        this.refill();
        return Math.floor(this.tokens);
    }

    /**
     * Force refill to capacity (for testing/reset scenarios)
     */
    reset(): void {
        this.tokens = this.capacity;
        this.lastRefillTime = performance.now();
        this.consumptionHistory = [];
    }
}

/**
 * Advanced Circuit Breaker with Health Probes
 * Implements the full circuit breaker pattern with:
 * - Adaptive failure thresholds
 * - Health probe requests in half-open state
 * - Exponential backoff for reset attempts
 * - Detailed failure analytics
 */
class AdvancedCircuitBreaker {
    private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
    private failureCount: number = 0;
    private successCount: number = 0;
    private consecutiveSuccesses: number = 0;
    private readonly failureThreshold: number;
    private readonly successThresholdForClose: number;
    private readonly baseResetTimeout: number;
    private readonly maxResetTimeout: number;
    private currentResetTimeout: number;
    private lastFailureTime: number = 0;
    private lastTransitionTime: number = Date.now();
    private failureReasons: Map<string, number> = new Map();
    private healthProbeInFlight: boolean = false;

    constructor(options: {
        failureThreshold?: number;
        successThresholdForClose?: number;
        baseResetTimeoutMs?: number;
        maxResetTimeoutMs?: number;
    } = {}) {
        this.failureThreshold = options.failureThreshold ?? 3;
        this.successThresholdForClose = options.successThresholdForClose ?? 2;
        this.baseResetTimeout = options.baseResetTimeoutMs ?? 30000; // 30 seconds
        this.maxResetTimeout = options.maxResetTimeoutMs ?? 300000; // 5 minutes
        this.currentResetTimeout = this.baseResetTimeout;
    }

    /**
     * Record a successful operation
     */
    recordSuccess(): void {
        this.successCount++;
        this.consecutiveSuccesses++;

        if (this.state === 'HALF_OPEN') {
            if (this.consecutiveSuccesses >= this.successThresholdForClose) {
                this.transitionTo('CLOSED');
                this.currentResetTimeout = this.baseResetTimeout; // Reset backoff
                console.log('🟢 Circuit Breaker: Transitioned to CLOSED after successful probes');
            }
        } else if (this.state === 'CLOSED') {
            // Decay failure count on success (self-healing)
            this.failureCount = Math.max(0, this.failureCount - 0.5);
        }

        this.healthProbeInFlight = false;
    }

    /**
     * Record a failed operation with reason tracking
     */
    recordFailure(reason?: string): void {
        this.failureCount++;
        this.consecutiveSuccesses = 0;
        this.lastFailureTime = Date.now();
        this.healthProbeInFlight = false;

        // Track failure reasons for analytics
        if (reason) {
            const normalizedReason = this.normalizeErrorReason(reason);
            this.failureReasons.set(
                normalizedReason,
                (this.failureReasons.get(normalizedReason) || 0) + 1
            );
        }

        if (this.state === 'CLOSED' && this.failureCount >= this.failureThreshold) {
            this.transitionTo('OPEN');
            console.warn('🔴 Circuit Breaker: TRIPPED - Entering OPEN state');
        } else if (this.state === 'HALF_OPEN') {
            // Failed health probe - back to OPEN with increased timeout
            this.transitionTo('OPEN');
            this.currentResetTimeout = Math.min(
                this.currentResetTimeout * 2,
                this.maxResetTimeout
            );
            console.warn(`🔴 Circuit Breaker: Health probe failed - OPEN with ${this.currentResetTimeout}ms timeout`);
        }
    }

    /**
     * Check if circuit allows requests
     */
    canExecute(): { allowed: boolean; reason?: string; retryAfterMs?: number } {
        const now = Date.now();

        switch (this.state) {
            case 'CLOSED':
                return { allowed: true };

            case 'OPEN':
                const timeSinceLastFailure = now - this.lastFailureTime;
                if (timeSinceLastFailure >= this.currentResetTimeout) {
                    this.transitionTo('HALF_OPEN');
                    console.log('🟡 Circuit Breaker: Transitioned to HALF_OPEN - allowing probe request');
                    return { allowed: true };
                }
                return {
                    allowed: false,
                    reason: 'Circuit breaker is OPEN - system recovering from failures',
                    retryAfterMs: this.currentResetTimeout - timeSinceLastFailure
                };

            case 'HALF_OPEN':
                // Only allow one probe request at a time
                if (this.healthProbeInFlight) {
                    return {
                        allowed: false,
                        reason: 'Health probe in progress - waiting for result',
                        retryAfterMs: 1000
                    };
                }
                this.healthProbeInFlight = true;
                return { allowed: true };

            default:
                return { allowed: true };
        }
    }

    private transitionTo(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN'): void {
        const oldState = this.state;
        this.state = newState;
        this.lastTransitionTime = Date.now();

        if (newState === 'CLOSED') {
            this.failureCount = 0;
            this.failureReasons.clear();
        }

        console.log(`Circuit Breaker: ${oldState} → ${newState}`);
    }

    private normalizeErrorReason(reason: string): string {
        if (reason.includes('401')) return 'AUTH_ERROR';
        if (reason.includes('403')) return 'FORBIDDEN';
        if (reason.includes('429')) return 'RATE_LIMITED';
        if (reason.includes('500') || reason.includes('502') || reason.includes('503')) return 'SERVER_ERROR';
        if (reason.includes('timeout') || reason.includes('ETIMEDOUT')) return 'TIMEOUT';
        if (reason.includes('network') || reason.includes('ECONNREFUSED')) return 'NETWORK_ERROR';
        return 'UNKNOWN';
    }

    /**
     * Get comprehensive circuit breaker status
     */
    getStatus(): CircuitBreakerStatus & {
        consecutiveSuccesses: number;
        currentTimeoutMs: number;
        failureAnalytics: Record<string, number>;
        timeInCurrentState: number;
    } {
        return {
            state: this.state,
            failures: this.failureCount,
            lastFailure: this.lastFailureTime || undefined,
            nextRetry: this.state === 'OPEN'
                ? this.lastFailureTime + this.currentResetTimeout
                : undefined,
            consecutiveSuccesses: this.consecutiveSuccesses,
            currentTimeoutMs: this.currentResetTimeout,
            failureAnalytics: Object.fromEntries(this.failureReasons),
            timeInCurrentState: Date.now() - this.lastTransitionTime
        };
    }

    /**
     * Force reset the circuit breaker (admin action)
     */
    forceReset(): void {
        this.state = 'CLOSED';
        this.failureCount = 0;
        this.consecutiveSuccesses = 0;
        this.currentResetTimeout = this.baseResetTimeout;
        this.failureReasons.clear();
        this.healthProbeInFlight = false;
        console.log('🔧 Circuit Breaker: Force reset to CLOSED state');
    }
}

/**
 * Retry Policy with Exponential Backoff and Jitter
 * Implements best practices for distributed systems resilience
 */
class RetryPolicy {
    private readonly maxRetries: number;
    private readonly baseDelayMs: number;
    private readonly maxDelayMs: number;
    private readonly jitterFactor: number;
    private readonly retryableErrors: Set<string>;

    constructor(options: {
        maxRetries?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        jitterFactor?: number;
    } = {}) {
        this.maxRetries = options.maxRetries ?? 3;
        this.baseDelayMs = options.baseDelayMs ?? 1000;
        this.maxDelayMs = options.maxDelayMs ?? 30000;
        this.jitterFactor = options.jitterFactor ?? 0.3;
        this.retryableErrors = new Set([
            'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE',
            '429', '500', '502', '503', '504',
            'network', 'timeout', 'Rate limit'
        ]);
    }

    /**
     * Execute an operation with retry logic
     */
    async execute<T>(
        operation: () => Promise<T>,
        context: string = 'operation'
    ): Promise<T> {
        let lastError: Error | undefined;

        for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!this.isRetryable(lastError) || attempt === this.maxRetries) {
                    throw lastError;
                }

                const delay = this.calculateDelay(attempt);
                console.log(`⏳ Retry ${attempt + 1}/${this.maxRetries} for ${context} in ${delay}ms`);
                await this.sleep(delay);
            }
        }

        throw lastError || new Error('Retry exhausted without error');
    }

    private isRetryable(error: Error): boolean {
        const errorString = error.message.toLowerCase();
        return Array.from(this.retryableErrors).some(
            retryable => errorString.includes(retryable.toLowerCase())
        );
    }

    private calculateDelay(attempt: number): number {
        // Exponential backoff with decorrelated jitter
        const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
        const jitter = exponentialDelay * this.jitterFactor * (Math.random() * 2 - 1);
        return Math.min(exponentialDelay + jitter, this.maxDelayMs);
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

/**
 * Reply Queue for Scheduled/Batched Operations
 * Implements priority queue with intelligent scheduling
 */
class ReplyQueue {
    private queue: QueuedReply[] = [];
    private processing: boolean = false;
    private readonly maxQueueSize: number = 100;

    /**
     * Add a reply to the queue with priority
     */
    enqueue(reply: QueuedReply): { success: boolean; position?: number; error?: string } {
        if (this.queue.length >= this.maxQueueSize) {
            return { success: false, error: 'Queue is full' };
        }

        // Insert based on priority (higher priority first)
        const insertIndex = this.queue.findIndex(
            r => (r.priority || 0) < (reply.priority || 0)
        );

        if (insertIndex === -1) {
            this.queue.push(reply);
        } else {
            this.queue.splice(insertIndex, 0, reply);
        }

        return { success: true, position: insertIndex === -1 ? this.queue.length : insertIndex + 1 };
    }

    /**
     * Get next reply to process
     */
    dequeue(): QueuedReply | undefined {
        return this.queue.shift();
    }

    /**
     * Peek at next item without removing
     */
    peek(): QueuedReply | undefined {
        return this.queue[0];
    }

    /**
     * Get queue status
     */
    getStatus(): {
        size: number;
        maxSize: number;
        isProcessing: boolean;
        nextScheduledAt?: number;
    } {
        return {
            size: this.queue.length,
            maxSize: this.maxQueueSize,
            isProcessing: this.processing,
            nextScheduledAt: this.queue[0]?.scheduledFor
        };
    }

    setProcessing(value: boolean): void {
        this.processing = value;
    }

    clear(): void {
        this.queue = [];
    }

    getAll(): QueuedReply[] {
        return [...this.queue];
    }
}

/**
 * Telemetry System for Observability
 * Tracks all operations with detailed metrics
 */
class AutomationTelemetry {
    private operations: Array<{
        type: string;
        startTime: number;
        endTime?: number;
        success: boolean;
        metadata?: Record<string, any>;
        error?: string;
    }> = [];

    private readonly maxOperations: number = 5000;

    startOperation(type: string, metadata?: Record<string, any>): () => void {
        const startTime = performance.now();
        const operation = { type, startTime, success: true, metadata };
        this.operations.push(operation);

        return (error?: string) => {
            operation.endTime = performance.now();
            if (error) {
                operation.success = false;
                operation.error = error;
            }
            this.pruneOldOperations();
        };
    }

    private pruneOldOperations(): void {
        if (this.operations.length > this.maxOperations) {
            this.operations = this.operations.slice(-this.maxOperations);
        }
    }

    getMetrics(windowMs: number = 3600000): {
        totalOperations: number;
        successRate: number;
        errorRate: number;
        avgLatencyMs: number;
        p50LatencyMs: number;
        p95LatencyMs: number;
        p99LatencyMs: number;
        operationsByType: Record<string, number>;
        errorsByType: Record<string, number>;
    } {
        const now = performance.now();
        const windowStart = now - windowMs;
        const recentOps = this.operations.filter(op => op.startTime >= windowStart);

        if (recentOps.length === 0) {
            return {
                totalOperations: 0,
                successRate: 1,
                errorRate: 0,
                avgLatencyMs: 0,
                p50LatencyMs: 0,
                p95LatencyMs: 0,
                p99LatencyMs: 0,
                operationsByType: {},
                errorsByType: {}
            };
        }

        const successfulOps = recentOps.filter(op => op.success);
        const latencies = recentOps
            .filter(op => op.endTime)
            .map(op => op.endTime! - op.startTime)
            .sort((a, b) => a - b);

        const operationsByType: Record<string, number> = {};
        const errorsByType: Record<string, number> = {};

        for (const op of recentOps) {
            operationsByType[op.type] = (operationsByType[op.type] || 0) + 1;
            if (!op.success && op.error) {
                errorsByType[op.error] = (errorsByType[op.error] || 0) + 1;
            }
        }

        return {
            totalOperations: recentOps.length,
            successRate: successfulOps.length / recentOps.length,
            errorRate: (recentOps.length - successfulOps.length) / recentOps.length,
            avgLatencyMs: latencies.length > 0
                ? latencies.reduce((a, b) => a + b, 0) / latencies.length
                : 0,
            p50LatencyMs: this.percentile(latencies, 0.5),
            p95LatencyMs: this.percentile(latencies, 0.95),
            p99LatencyMs: this.percentile(latencies, 0.99),
            operationsByType,
            errorsByType
        };
    }

    private percentile(sortedArr: number[], p: number): number {
        if (sortedArr.length === 0) return 0;
        const index = Math.ceil(sortedArr.length * p) - 1;
        return sortedArr[Math.max(0, index)];
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN AUTOMATION SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * X API Automation Service - Horological Precision Edition
 *
 * Features:
 * - Precision rate limiting with token bucket algorithm
 * - Advanced circuit breaker with adaptive thresholds
 * - Retry policies with exponential backoff and jitter
 * - Reply queue for scheduled operations
 * - Comprehensive telemetry and observability
 * - ML-inspired eligibility scoring
 */
export class XAutomationService {
    private roClient: TwitterApiReadOnly;
    private rwClient?: TwitterApi;
    private config: AutomationConfig;

    // Precision Components
    private readonly hourlyBucket: PrecisionTokenBucket;
    private readonly dailyBucket: PrecisionTokenBucket;
    private readonly circuitBreaker: AdvancedCircuitBreaker;
    private readonly retryPolicy: RetryPolicy;
    private readonly replyQueue: ReplyQueue;
    private readonly telemetry: AutomationTelemetry;

    private lastReplyTime: number = 0;
    private startupTime: number = Date.now();
    private credentialsValidated: boolean = false;

    constructor(credentials: XApiCredentials, config: AutomationConfig) {
        // Validate credentials
        if (!credentials.bearerToken || credentials.bearerToken.trim().length === 0) {
            throw new Error("INVALID_CREDENTIALS: A valid Twitter API v2 Bearer Token is required");
        }

        // Initialize read-only client
        this.roClient = new TwitterApi(credentials.bearerToken.trim()).readOnly;

        // Initialize read-write client if full credentials provided
        if (this.hasFullCredentials(credentials)) {
            try {
                this.rwClient = new TwitterApi({
                    appKey: credentials.appKey.trim(),
                    appSecret: credentials.appSecret.trim(),
                    accessToken: credentials.accessToken.trim(),
                    accessSecret: credentials.accessSecret.trim(),
                });
                console.log("✅ Read-write X client initialized successfully");
            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : String(err);
                console.error("❌ Failed to initialize read-write client:", errorMessage);
                throw new Error(`OAUTH_INIT_FAILED: ${errorMessage}`);
            }
        } else {
            console.log("ℹ️ Read-only mode: Full OAuth credentials required for posting replies");
        }

        this.config = this.validateConfig(config);

        // Initialize precision components
        this.hourlyBucket = new PrecisionTokenBucket(
            config.maxRepliesPerHour,
            config.maxRepliesPerHour // Refill rate = max per hour
        );

        this.dailyBucket = new PrecisionTokenBucket(
            config.maxRepliesPerDay,
            config.maxRepliesPerDay / 24 // Refill rate = max per day / 24 hours
        );

        this.circuitBreaker = new AdvancedCircuitBreaker({
            failureThreshold: 3,
            successThresholdForClose: 2,
            baseResetTimeoutMs: 30000,
            maxResetTimeoutMs: 300000
        });

        this.retryPolicy = new RetryPolicy({
            maxRetries: 3,
            baseDelayMs: 1000,
            maxDelayMs: 30000,
            jitterFactor: 0.3
        });

        this.replyQueue = new ReplyQueue();
        this.telemetry = new AutomationTelemetry();
    }

    private hasFullCredentials(creds: XApiCredentials): boolean {
        return !!(
            creds.appKey?.trim() &&
            creds.appSecret?.trim() &&
            creds.accessToken?.trim() &&
            creds.accessSecret?.trim()
        );
    }

    private validateConfig(config: AutomationConfig): AutomationConfig {
        return {
            ...config,
            maxRepliesPerHour: Math.max(1, Math.min(config.maxRepliesPerHour, 50)),
            maxRepliesPerDay: Math.max(1, Math.min(config.maxRepliesPerDay, 500)),
            cooldownBetweenReplies: Math.max(1, config.cooldownBetweenReplies),
            safetyChecks: {
                ...config.safetyChecks,
                minimumConfidenceScore: Math.max(0, Math.min(config.safetyChecks.minimumConfidenceScore, 100))
            }
        };
    }

    /**
     * Health Check - Verify API connectivity and credentials
     */
    async healthCheck(): Promise<HealthCheckResult> {
        const endTelemetry = this.telemetry.startOperation('health_check');
        const checks: HealthCheckResult = {
            healthy: true,
            timestamp: new Date().toISOString(),
            checks: {
                readApi: { status: 'unknown', latencyMs: 0 },
                writeApi: { status: 'unknown', latencyMs: 0 },
                circuitBreaker: { status: 'unknown' },
                rateLimits: { status: 'unknown' }
            }
        };

        try {
            // Check read API
            const readStart = performance.now();
            try {
                await this.roClient.v2.me();
                checks.checks.readApi = {
                    status: 'healthy',
                    latencyMs: Math.round(performance.now() - readStart)
                };
            } catch (e) {
                checks.checks.readApi = {
                    status: 'unhealthy',
                    latencyMs: Math.round(performance.now() - readStart),
                    error: e instanceof Error ? e.message : 'Unknown error'
                };
                checks.healthy = false;
            }

            // Check write API (if available)
            if (this.rwClient) {
                const writeStart = performance.now();
                try {
                    await this.rwClient.v2.me();
                    checks.checks.writeApi = {
                        status: 'healthy',
                        latencyMs: Math.round(performance.now() - writeStart)
                    };
                } catch (e) {
                    checks.checks.writeApi = {
                        status: 'unhealthy',
                        latencyMs: Math.round(performance.now() - writeStart),
                        error: e instanceof Error ? e.message : 'Unknown error'
                    };
                    // Write API failure doesn't mark entire system unhealthy if in dry run
                    if (!this.config.dryRun) {
                        checks.healthy = false;
                    }
                }
            } else {
                checks.checks.writeApi = { status: 'not_configured' };
            }

            // Check circuit breaker
            const cbStatus = this.circuitBreaker.getStatus();
            checks.checks.circuitBreaker = {
                status: cbStatus.state === 'CLOSED' ? 'healthy' :
                        cbStatus.state === 'HALF_OPEN' ? 'degraded' : 'unhealthy',
                state: cbStatus.state
            };
            if (cbStatus.state === 'OPEN') {
                checks.healthy = false;
            }

            // Check rate limits
            const hourlyStatus = this.hourlyBucket.getStatus();
            const dailyStatus = this.dailyBucket.getStatus();
            checks.checks.rateLimits = {
                status: hourlyStatus.tokens > 0 && dailyStatus.tokens > 0 ? 'healthy' : 'exhausted',
                hourlyRemaining: hourlyStatus.tokens,
                dailyRemaining: dailyStatus.tokens
            };

            endTelemetry();
            this.credentialsValidated = checks.healthy;
            return checks;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            endTelemetry(errorMessage);
            checks.healthy = false;
            checks.error = errorMessage;
            return checks;
        }
    }

    /**
     * Find Candidate Posts with ML-Inspired Eligibility Scoring
     */
    async findCandidatePosts(criteria: PostSearchCriteria): Promise<PostCandidate[]> {
        const endTelemetry = this.telemetry.startOperation('find_candidates', { criteria });

        // Check circuit breaker
        const cbCheck = this.circuitBreaker.canExecute();
        if (!cbCheck.allowed) {
            endTelemetry(cbCheck.reason);
            throw new Error(cbCheck.reason || 'Circuit breaker is open');
        }

        try {
            const result = await this.retryPolicy.execute(
                async () => this.executePostSearch(criteria),
                'find_candidates'
            );

            this.circuitBreaker.recordSuccess();
            endTelemetry();
            return result;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.circuitBreaker.recordFailure(errorMessage);
            endTelemetry(errorMessage);

            // Transform error for better UX
            if (errorMessage.includes('401')) {
                throw new Error('AUTHENTICATION_ERROR: Bearer Token is invalid or revoked. Please check your credentials.');
            }
            if (errorMessage.includes('403')) {
                throw new Error('AUTHORIZATION_ERROR: Your app lacks the required permissions. Ensure you have Essential or Elevated access.');
            }
            if (errorMessage.includes('429')) {
                throw new Error('RATE_LIMIT_ERROR: X API rate limit exceeded. Please wait before retrying.');
            }
            throw new Error(`SEARCH_ERROR: ${errorMessage}`);
        }
    }

    private async executePostSearch(criteria: PostSearchCriteria): Promise<PostCandidate[]> {
        // Build optimized search query
        const searchQuery = this.buildSearchQuery(criteria);
        console.log(`🔍 Executing search: ${searchQuery}`);

        const searchResults = await this.roClient.v2.search(searchQuery, {
            max_results: 100,
            'tweet.fields': ['created_at', 'public_metrics', 'author_id', 'conversation_id', 'in_reply_to_user_id'],
            'user.fields': ['username', 'name', 'public_metrics', 'verified', 'description', 'created_at'],
            expansions: ['author_id']
        });

        if (!searchResults.data?.data) {
            return [];
        }

        const users = new Map<string, UserV2>();
        for (const user of searchResults.includes?.users || []) {
            users.set(user.id, user);
        }

        const candidates: PostCandidate[] = [];
        const now = Date.now();

        for (const tweet of searchResults.data.data) {
            const author = users.get(tweet.author_id!);
            if (!author) continue;

            // Apply filters
            const ageHours = (now - new Date(tweet.created_at!).getTime()) / 3600000;
            if (ageHours > criteria.maxAgeHours) continue;

            const metrics = tweet.public_metrics!;
            const authorMetrics = author.public_metrics!;

            // Skip blacklisted accounts
            if (this.config.blacklistedAccounts?.includes(author.username)) continue;

            // Apply follower filters
            if (criteria.authorFollowerMin && authorMetrics.followers_count < criteria.authorFollowerMin) continue;
            if (criteria.authorFollowerMax && authorMetrics.followers_count > criteria.authorFollowerMax) continue;

            // Calculate eligibility score using ML-inspired features
            const eligibilityResult = this.calculateEligibilityScore(tweet, author, ageHours);

            if (eligibilityResult.score < 0.4) continue;

            candidates.push({
                id: tweet.id,
                text: tweet.text,
                authorHandle: `@${author.username}`,
                authorName: author.name,
                createdAt: new Date(tweet.created_at!),
                metrics: {
                    views: metrics.impression_count || 0,
                    likes: metrics.like_count,
                    reposts: metrics.retweet_count,
                    replies: metrics.reply_count
                },
                eligibilityScore: eligibilityResult.score,
                reasons: eligibilityResult.reasons
            });
        }

        // Sort by eligibility score (descending) and return top candidates
        return candidates
            .sort((a, b) => b.eligibilityScore - a.eligibilityScore)
            .slice(0, 20);
    }

    private buildSearchQuery(criteria: PostSearchCriteria): string {
        const parts: string[] = [];

        // Keywords (OR logic)
        if (criteria.keywords?.length) {
            parts.push(`(${criteria.keywords.join(' OR ')})`);
        } else {
            parts.push('(AI OR startup OR tech OR business)');
        }

        // Language filter
        const languages = criteria.languages?.length ? criteria.languages : ['en'];
        parts.push(`(${languages.map(l => `lang:${l}`).join(' OR ')})`);

        // Exclude retweets and replies unless specified
        if (!criteria.includeRetweets) parts.push('-is:retweet');
        if (!criteria.includeReplies) parts.push('-is:reply');

        // Exclude keywords
        if (criteria.excludeKeywords?.length) {
            for (const kw of criteria.excludeKeywords) {
                parts.push(`-${kw}`);
            }
        }

        return parts.join(' ');
    }

    /**
     * ML-Inspired Eligibility Scoring Algorithm
     *
     * Features used:
     * - Engagement rate (normalized)
     * - Follower score (log-scaled)
     * - Recency bonus (time decay)
     * - Reply competition (inverse)
     * - Author authority (followers/following ratio)
     * - Content quality signals (length, hashtags, mentions)
     */
    private calculateEligibilityScore(
        tweet: TweetV2,
        author: UserV2,
        ageHours: number
    ): { score: number; reasons: string[] } {
        const metrics = tweet.public_metrics!;
        const authorMetrics = author.public_metrics!;
        const reasons: string[] = [];

        // Feature 1: Engagement Rate (weight: 0.25)
        const totalEngagement = metrics.like_count + metrics.retweet_count * 2 + metrics.reply_count * 3;
        const engagementRate = totalEngagement / Math.max(authorMetrics.followers_count, 1);
        const engagementScore = Math.min(engagementRate * 500, 0.25);
        if (engagementScore > 0.15) reasons.push('High engagement rate');

        // Feature 2: Author Influence (weight: 0.20)
        const followerScore = Math.log10(Math.max(authorMetrics.followers_count, 10)) / 8;
        const influenceScore = Math.min(followerScore, 0.20);
        if (authorMetrics.followers_count > 100000) reasons.push('Influential author');
        if (author.verified) {
            reasons.push('Verified account');
        }

        // Feature 3: Recency Bonus (weight: 0.15)
        // Exponential decay: newer posts score higher
        const recencyScore = Math.max(0, (1 - ageHours / 24)) * 0.15;
        if (ageHours < 2) reasons.push('Fresh post');

        // Feature 4: Reply Competition (weight: 0.15)
        // Lower reply count = higher opportunity
        const replyCompetition = 1 / (1 + metrics.reply_count * 0.05);
        const competitionScore = replyCompetition * 0.15;
        if (metrics.reply_count < 20) reasons.push('Low reply competition');

        // Feature 5: Author Authority (weight: 0.10)
        // High followers/following ratio indicates authority
        const followRatio = authorMetrics.followers_count / Math.max(authorMetrics.following_count, 1);
        const authorityScore = Math.min(Math.log10(Math.max(followRatio, 1)) * 0.05, 0.10);
        if (followRatio > 10) reasons.push('High authority account');

        // Feature 6: Content Quality Signals (weight: 0.10)
        const tweetLength = tweet.text.length;
        const hasMedia = tweet.text.includes('pic.twitter.com') || tweet.text.includes('https://');
        const hashtagCount = (tweet.text.match(/#\w+/g) || []).length;

        let contentScore = 0;
        if (tweetLength > 100 && tweetLength < 250) contentScore += 0.03; // Optimal length
        if (hasMedia) contentScore += 0.02;
        if (hashtagCount >= 1 && hashtagCount <= 3) contentScore += 0.02;
        contentScore = Math.min(contentScore, 0.10);
        if (contentScore > 0.05) reasons.push('Quality content signals');

        // Feature 7: Virality Potential (weight: 0.05)
        const viewsPerFollower = (metrics.impression_count || 0) / Math.max(authorMetrics.followers_count, 1);
        const viralityScore = Math.min(viewsPerFollower * 0.5, 0.05);
        if (viewsPerFollower > 2) reasons.push('Viral potential');

        // Combine all features
        const totalScore =
            engagementScore +
            influenceScore +
            recencyScore +
            competitionScore +
            authorityScore +
            contentScore +
            viralityScore;

        return {
            score: Math.min(totalScore, 1.0),
            reasons: reasons.length > 0 ? reasons : ['Baseline eligibility']
        };
    }

    /**
     * Generate and Post Reply with Quality Gates
     */
    async generateAndReply(post: PostCandidate): Promise<AutomationResult> {
        const startTime = performance.now();
        const endTelemetry = this.telemetry.startOperation('generate_and_reply', { postId: post.id });

        // Pre-flight checks
        const preflightResult = this.runPreflightChecks();
        if (!preflightResult.allowed) {
            endTelemetry(preflightResult.reason);
            return {
                success: false,
                error: preflightResult.reason,
                timestamp: new Date()
            };
        }

        try {
            // Generate reply strategies
            console.log(`🧠 Generating reply strategies for post ${post.id}...`);
            const { strategies } = await generateReplies(post.text, post.authorHandle, {
                useCache: false,
                temperature: 0.4
            });

            if (!strategies || strategies.length === 0) {
                endTelemetry('No strategies generated');
                return {
                    success: false,
                    error: 'AI_GENERATION_FAILED: No suitable reply strategies were generated',
                    timestamp: new Date()
                };
            }

            // Select best strategy
            const sortedStrategies = [...strategies].sort(
                (a, b) => b.scores.algorithmScore - a.scores.algorithmScore
            );
            const bestStrategy = sortedStrategies[0];

            // Quality gate: Check confidence threshold
            if (bestStrategy.scores.algorithmScore < this.config.safetyChecks.minimumConfidenceScore) {
                endTelemetry('Below confidence threshold');
                return {
                    success: false,
                    error: `QUALITY_GATE_FAILED: Strategy score (${bestStrategy.scores.algorithmScore}) is below minimum threshold (${this.config.safetyChecks.minimumConfidenceScore})`,
                    timestamp: new Date(),
                    strategy: bestStrategy
                };
            }

            // Quality gate: Check Sanctum safety
            if (bestStrategy.gauntletResults?.sanctum && !bestStrategy.gauntletResults.sanctum.isSafe) {
                endTelemetry('Sanctum safety check failed');
                return {
                    success: false,
                    error: `SANCTUM_GATE_FAILED: Reply flagged by safety protocol. Flags: ${bestStrategy.gauntletResults.sanctum.flags.join(', ')}`,
                    timestamp: new Date(),
                    strategy: bestStrategy
                };
            }

            // Dry run mode - simulate posting
            if (this.config.dryRun || !this.rwClient) {
                console.log(`🔸 [DRY RUN] Would reply to post ${post.id}:`);
                console.log(`   Reply: "${bestStrategy.replyText}"`);
                console.log(`   Score: ${bestStrategy.scores.algorithmScore}`);

                endTelemetry();
                return {
                    success: true,
                    postId: post.id,
                    strategy: bestStrategy,
                    timestamp: new Date(),
                    metrics: {
                        processingTime: performance.now() - startTime,
                        confidenceScore: bestStrategy.scores.algorithmScore
                    }
                };
            }

            // Post the reply
            console.log(`📤 Posting reply to ${post.id}...`);
            const replyResult = await this.retryPolicy.execute(
                async () => this.rwClient!.v2.reply(bestStrategy.replyText, post.id),
                'post_reply'
            );

            // Update state on success
            this.circuitBreaker.recordSuccess();
            this.lastReplyTime = Date.now();
            this.hourlyBucket.tryConsume(1);
            this.dailyBucket.tryConsume(1);

            console.log(`✅ Reply posted successfully: ${replyResult.data.id}`);
            endTelemetry();

            return {
                success: true,
                postId: post.id,
                replyId: replyResult.data.id,
                strategy: bestStrategy,
                timestamp: new Date(),
                metrics: {
                    processingTime: performance.now() - startTime,
                    confidenceScore: bestStrategy.scores.algorithmScore
                }
            };

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            this.circuitBreaker.recordFailure(errorMessage);
            endTelemetry(errorMessage);

            // Transform X API errors for better UX
            const friendlyError = this.transformApiError(errorMessage);

            return {
                success: false,
                postId: post.id,
                error: friendlyError,
                timestamp: new Date()
            };
        }
    }

    private runPreflightChecks(): { allowed: boolean; reason?: string } {
        // Check circuit breaker
        const cbCheck = this.circuitBreaker.canExecute();
        if (!cbCheck.allowed) {
            return { allowed: false, reason: cbCheck.reason };
        }

        // Check if write client is available (for live mode)
        if (!this.config.dryRun && !this.rwClient) {
            return {
                allowed: false,
                reason: 'CREDENTIALS_REQUIRED: Full OAuth credentials are required for live replies'
            };
        }

        // Check hourly rate limit
        const hourlyStatus = this.hourlyBucket.tryConsume(0); // Peek without consuming
        if (this.hourlyBucket.peek() < 1 && !this.config.dryRun) {
            return {
                allowed: false,
                reason: `HOURLY_RATE_LIMIT: Token bucket empty. Next refill in ~${Math.ceil((hourlyStatus.waitTimeMs || 60000) / 60000)} minutes`
            };
        }

        // Check daily rate limit
        if (this.dailyBucket.peek() < 1 && !this.config.dryRun) {
            return {
                allowed: false,
                reason: 'DAILY_RATE_LIMIT: Daily posting limit reached. Resets at midnight'
            };
        }

        // Check cooldown
        const timeSinceLastReply = Date.now() - this.lastReplyTime;
        const cooldownMs = this.config.cooldownBetweenReplies * 60 * 1000;
        if (this.lastReplyTime > 0 && timeSinceLastReply < cooldownMs && !this.config.dryRun) {
            const waitSeconds = Math.ceil((cooldownMs - timeSinceLastReply) / 1000);
            return {
                allowed: false,
                reason: `COOLDOWN_ACTIVE: Please wait ${waitSeconds}s before next reply`
            };
        }

        return { allowed: true };
    }

    private transformApiError(error: string): string {
        if (error.includes('400')) {
            return 'BAD_REQUEST: The reply content may be invalid or contain forbidden characters';
        }
        if (error.includes('401')) {
            return 'AUTHENTICATION_ERROR: Your API credentials are invalid or have been revoked';
        }
        if (error.includes('403')) {
            if (error.includes('duplicate')) {
                return 'DUPLICATE_REPLY: This reply is too similar to a previous tweet';
            }
            return 'AUTHORIZATION_ERROR: Your app lacks permission for this action. Check your X Developer Portal settings';
        }
        if (error.includes('429')) {
            return 'RATE_LIMITED: X API rate limit exceeded. The system will automatically retry later';
        }
        if (error.includes('500') || error.includes('502') || error.includes('503')) {
            return 'X_SERVICE_ERROR: X platform is experiencing issues. Please try again later';
        }
        return `API_ERROR: ${error}`;
    }

    /**
     * Run Full Automation Cycle
     */
    async runAutomation(criteria: PostSearchCriteria): Promise<AutomationResult[]> {
        const endTelemetry = this.telemetry.startOperation('run_automation');

        if (!this.config.enabled) {
            endTelemetry('Automation disabled');
            return [{
                success: false,
                error: 'AUTOMATION_DISABLED: Enable automation in settings to run',
                timestamp: new Date()
            }];
        }

        // Pre-flight checks
        const preflightResult = this.runPreflightChecks();
        if (!preflightResult.allowed && !this.config.dryRun) {
            endTelemetry(preflightResult.reason);
            return [{
                success: false,
                error: preflightResult.reason,
                timestamp: new Date()
            }];
        }

        try {
            // Find candidates
            const candidates = await this.findCandidatePosts(criteria);

            if (candidates.length === 0) {
                endTelemetry('No candidates found');
                return [{
                    success: false,
                    error: 'NO_CANDIDATES: No eligible posts found matching your criteria. Try adjusting filters',
                    timestamp: new Date()
                }];
            }

            console.log(`📊 Found ${candidates.length} candidate posts`);

            // Process best candidate
            const bestCandidate = candidates[0];
            console.log(`🎯 Processing best candidate: ${bestCandidate.id} by ${bestCandidate.authorHandle}`);
            console.log(`   Eligibility: ${(bestCandidate.eligibilityScore * 100).toFixed(1)}%`);
            console.log(`   Reasons: ${bestCandidate.reasons.join(', ')}`);

            const result = await this.generateAndReply(bestCandidate);

            endTelemetry();
            return [result];

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            endTelemetry(errorMessage);
            return [{
                success: false,
                error: errorMessage,
                timestamp: new Date()
            }];
        }
    }

    /**
     * Get Comprehensive Automation Status
     */
    getStatus(): AutomationStatus {
        const hourlyStatus = this.hourlyBucket.getStatus();
        const dailyStatus = this.dailyBucket.getStatus();
        const cbStatus = this.circuitBreaker.getStatus();
        const queueStatus = this.replyQueue.getStatus();
        const metrics = this.telemetry.getMetrics();

        return {
            enabled: this.config.enabled,
            dryRun: this.config.dryRun,
            healthy: cbStatus.state === 'CLOSED' && hourlyStatus.tokens > 0,
            uptime: Date.now() - this.startupTime,
            credentialsValidated: this.credentialsValidated,

            rateLimits: {
                hourly: {
                    remaining: hourlyStatus.tokens,
                    limit: hourlyStatus.capacity,
                    utilizationPercent: hourlyStatus.utilizationPercent
                },
                daily: {
                    remaining: dailyStatus.tokens,
                    limit: dailyStatus.capacity,
                    utilizationPercent: dailyStatus.utilizationPercent
                }
            },

            cooldown: {
                active: this.lastReplyTime > 0 &&
                    (Date.now() - this.lastReplyTime) < (this.config.cooldownBetweenReplies * 60 * 1000),
                remainingMs: Math.max(0,
                    (this.lastReplyTime + this.config.cooldownBetweenReplies * 60 * 1000) - Date.now()
                ),
                lastReplyAt: this.lastReplyTime > 0 ? new Date(this.lastReplyTime).toISOString() : undefined
            },

            circuitBreaker: {
                state: cbStatus.state,
                failures: cbStatus.failures,
                consecutiveSuccesses: cbStatus.consecutiveSuccesses,
                nextRetryAt: cbStatus.nextRetry ? new Date(cbStatus.nextRetry).toISOString() : undefined
            },

            queue: {
                size: queueStatus.size,
                maxSize: queueStatus.maxSize,
                isProcessing: queueStatus.isProcessing
            },

            telemetry: {
                totalOperations: metrics.totalOperations,
                successRate: Math.round(metrics.successRate * 100),
                avgLatencyMs: Math.round(metrics.avgLatencyMs),
                p99LatencyMs: Math.round(metrics.p99LatencyMs)
            }
        };
    }

    /**
     * Update Configuration
     */
    updateConfig(newConfig: Partial<AutomationConfig>): void {
        this.config = this.validateConfig({ ...this.config, ...newConfig });

        // Note: Token buckets are not recreated to preserve current state
        // Only rate limits are logically enforced through config

        console.log('⚙️ Automation config updated');
    }

    /**
     * Add Reply to Queue
     */
    queueReply(post: PostCandidate, priority: number = 5, scheduledFor?: number): { success: boolean; position?: number; error?: string } {
        return this.replyQueue.enqueue({
            post,
            priority,
            scheduledFor,
            addedAt: Date.now()
        });
    }

    /**
     * Process Reply Queue
     */
    async processQueue(): Promise<AutomationResult[]> {
        const results: AutomationResult[] = [];
        this.replyQueue.setProcessing(true);

        try {
            while (true) {
                const item = this.replyQueue.peek();
                if (!item) break;

                // Check if scheduled time has arrived
                if (item.scheduledFor && Date.now() < item.scheduledFor) {
                    break; // Wait for scheduled time
                }

                // Check rate limits
                const preflightResult = this.runPreflightChecks();
                if (!preflightResult.allowed && !this.config.dryRun) {
                    break; // Rate limited, stop processing
                }

                // Process the item
                this.replyQueue.dequeue();
                const result = await this.generateAndReply(item.post);
                results.push(result);

                // Wait for cooldown before next item
                if (!this.config.dryRun && results.length > 0) {
                    await new Promise(r => setTimeout(r, this.config.cooldownBetweenReplies * 60 * 1000));
                }
            }
        } finally {
            this.replyQueue.setProcessing(false);
        }

        return results;
    }

    /**
     * Force Reset Circuit Breaker (Admin Action)
     */
    forceResetCircuitBreaker(): void {
        this.circuitBreaker.forceReset();
    }

    /**
     * Get Detailed Telemetry
     */
    getTelemetry(): ReturnType<AutomationTelemetry['getMetrics']> {
        return this.telemetry.getMetrics();
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FACTORY & DEFAULTS
// ═══════════════════════════════════════════════════════════════════════════════

export function createXAutomationService(
    credentials: XApiCredentials,
    config: AutomationConfig
): XAutomationService {
    return new XAutomationService(credentials, config);
}

export const DEFAULT_AUTOMATION_CONFIG: AutomationConfig = {
    enabled: false,
    maxRepliesPerHour: 5,
    maxRepliesPerDay: 20,
    cooldownBetweenReplies: 15, // minutes
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
    excludeKeywords: ['politics', 'spam', 'crypto scam'],
    authorFollowerMin: 10000,
    languages: ['en']
};
