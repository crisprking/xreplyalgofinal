
// ═══════════════════════════════════════════════════════════════════════════════
// APEX X ULTIMATE SYSTEM v8.0 - TYPE DEFINITIONS
// "Horological Precision Edition"
// Complete type safety for Swiss-watch precision engineering
// ═══════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// SCORING & QUALITY METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 12-Dimensional Scoring Matrix for Reply Strategies
 * Each dimension contributes to the overall algorithm score
 */
export interface Scores {
    /** Authority of the reply in context (0-100) */
    authority: number;
    /** Hook strength - ability to capture attention (0-100) */
    hook: number;
    /** Wealth/business fit for monetization potential (0-100) */
    wealthFit: number;
    /** Viral potential based on shareability (0-100) */
    viralPotential: number;
    /** Emotional impact on readers (0-100) */
    emotionalImpact: number;
    /** Intellectual depth and substance (0-100) */
    intellectualDepth: number;
    /** Overall algorithm score - primary ranking metric (0-100) */
    algorithmScore: number;
    /** Authenticity - sounds human, not AI-generated (0-100) */
    authenticity: number;
    /** Memorability - likelihood to be remembered (0-100) */
    memorability: number;
    /** Network effect - potential for amplification (0-100) */
    networkEffect: number;
    /** Timing optimality for the post age (0-100) */
    timingOptimal: number;
    /** GraphJet relevance based on network topology (0-100) */
    graphJetRelevance: number;
}

/**
 * Sanctum Safety Check Results
 * Zero-tolerance quality control for content safety
 */
export interface SanctumCheck {
    /** Overall safety determination */
    isSafe: boolean;
    /** Toxicity score (0-100, lower is better) */
    toxicityScore: number;
    /** Quality tier assignment */
    qualityTier: 'S' | 'A' | 'B' | 'C' | 'F';
    /** Specific flags/issues identified */
    flags: string[];
}

/**
 * Gauntlet Quality Assurance Results
 * Comprehensive checklist for reply quality
 */
export interface GauntletResults {
    /** Contains novel information or perspective */
    novelty: boolean;
    /** Has potential for meaningful impact */
    impact: boolean;
    /** Meets quality standards */
    quality: boolean;
    /** Likely to generate author reply */
    authorReply: boolean;
    /** Safe for brand/reputation */
    brandSafety: boolean;
    /** Contextually relevant to the post */
    contextualRelevance: boolean;
    /** Potential for scaling engagement */
    scalabilityPotential: boolean;
    /** Safe from Community Notes flagging */
    communityNotesSafe: boolean;
    /** Predicted helpfulness score (0.0-1.0) */
    noteHelpfulnessPrediction: number;
    /** Sanctum safety layer results */
    sanctum: SanctumCheck;
}

/**
 * Heavy Ranker Feature Predictions
 * Simulates Twitter's ranking algorithm predictions
 */
export interface HeavyRankerFeatures {
    /** Probability of receiving a reply */
    pReply: number;
    /** Probability of receiving a like */
    pLike: number;
    /** Probability of being retweeted */
    pRetweet: number;
    /** Probability of profile click */
    pProfileClick: number;
    /** Author's reputation score (0-100) */
    authorReputation: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GraphJet Network Context
 * Network topology analysis for the post
 */
export interface GraphJetContext {
    /** Cluster membership (e.g., "Tech Twitter", "Crypto", "VC") */
    cluster: string;
    /** Node centrality score (0-100) */
    centrality: number;
    /** Interaction velocity classification */
    interactionVelocity: 'static' | 'rising' | 'viral';
}

/**
 * Deep Post Deconstruction
 * Psychological and strategic analysis of the original post
 */
export interface PostDeconstruction {
    /** Core thesis/argument of the post */
    coreThesis: string;
    /** Hidden meanings and implications */
    subtextAndImplications: string;
    /** Target audience profile */
    targetAudienceProfile: string;
    /** Psychological hooks that make it compelling */
    psychologicalHooks: string[];
    /** Strategic openings for replies */
    strategicOpenings: string[];
    /** Overall emotional tone */
    emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
    /** Urgency level of the content */
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    /** Controversy risk assessment */
    controversyRisk: 'minimal' | 'low' | 'moderate' | 'high';
    /** Author personality archetype */
    authorPersonality: 'thought-leader' | 'entrepreneur' | 'academic' | 'influencer' | 'analyst';
    /** Temporal relevance classification */
    temporalRelevance: 'evergreen' | 'trending' | 'breaking' | 'seasonal';
    /** Graph influence position */
    graphInfluence: 'central' | 'peripheral' | 'bridge';
    /** GraphJet network context */
    graphJetContext: GraphJetContext;
    /** Heavy Ranker feature predictions */
    heavyRankerFeatures: HeavyRankerFeatures;
}

/**
 * Complete Post Analysis Results
 */
export interface PostAnalysis {
    /** Word count of the post */
    wordCount: number;
    /** Sophistication level */
    sophistication: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';
    /** Detected tone */
    tone: string;
    /** Full deconstruction analysis */
    deconstruction: PostDeconstruction;
    /** Original post text */
    originalPostText: string;
    /** Original author handle */
    originalAuthorHandle: string;
    /** Estimated reach */
    estimatedReach?: number;
    /** Post type classification */
    postType?: 'thread' | 'single' | 'reply' | 'quote' | 'media';
    /** Time of posting */
    timeOfPosting?: Date;
    /** Current engagement metrics */
    engagementMetrics?: {
        likes: number;
        reposts: number;
        replies: number;
        views?: number;
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// REPLY STRATEGIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * A/B Test Variant for Diffy Simulation
 */
export interface ABVariant {
    /** Variant identifier */
    id: 'A' | 'B';
    /** Reply text for this variant */
    text: string;
    /** Weighted character length (Twitter-Text spec) */
    weightedLength: number;
    /** Predicted conversion rate (0-1) */
    predictedConversion: number;
    /** Rationale for this variant */
    rationale: string;
    /** Traffic allocation percentage (0-100) */
    trafficAllocation: number;
}

/**
 * Expected Outcome Scenarios
 */
export interface ExpectedOutcomes {
    /** Best case scenario description */
    bestCase: string;
    /** Worst case scenario description */
    worstCase: string;
    /** Most likely scenario description */
    mostLikely: string;
}

/**
 * Complete Reply Strategy
 */
export interface ReplyStrategy {
    /** Strategy name/type */
    strategy: string;
    /** Primary reply text */
    replyText: string;
    /** Standard character count */
    charCount: number;
    /** Weighted character length (Twitter-Text spec) */
    weightedLength: number;
    /** Strategic angle description */
    strategicAngle: string;
    /** Risk assessment description */
    riskAssessment: string;
    /** 12-dimensional scores */
    scores: Scores;
    /** Gauntlet quality assurance results */
    gauntletResults: GauntletResults;
    /** Rationale for the scores */
    scoreRationale: string;
    /** Reasoning behind the strategy */
    reasoning: string;
    /** Confidence level (0-100) */
    confidence: number;
    /** Probability of author replying (0-1) */
    authorReplyProbability: number;
    /** Strategy category */
    strategyCategory: 'analytical' | 'contrarian' | 'supportive' | 'challenging' | 'educational';
    /** Optimal timing recommendation */
    optimalTiming: string;
    /** Fallback variations of the reply */
    fallbackVariations: string[];
    /** A/B test variants (optional) */
    abVariants?: [ABVariant, ABVariant];
    /** Risk mitigation suggestions */
    riskMitigation: string;
    /** Expected outcomes */
    expectedOutcomes: ExpectedOutcomes;
}

/**
 * Gemini API Response Structure
 */
export interface GeminiResponse {
    analysis: Omit<PostAnalysis, 'originalPostText' | 'originalAuthorHandle'>;
    strategies: ReplyStrategy[];
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Document Milestone
 */
export interface Milestone {
    date: string;
    event: string;
    details: string;
}

/**
 * Key Resource Reference
 */
export interface KeyResource {
    name: string;
    link?: string;
    description?: string;
}

/**
 * Complete Document Analysis Results
 */
export interface DocumentAnalysis {
    title: string;
    summary: string;
    objectives: string[];
    milestones: Milestone[];
    modelsAndApproaches: string[];
    keyResources: KeyResource[];
    submissionRequirements: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// X API CREDENTIALS & CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * X API Credentials
 * Supports both OAuth 1.0a and Bearer Token authentication
 */
export interface XApiCredentials {
    /** Bearer Token for read-only API access */
    bearerToken: string;
    /** OAuth 1.0a App Key (Consumer Key) */
    appKey: string;
    /** OAuth 1.0a App Secret (Consumer Secret) */
    appSecret: string;
    /** OAuth 1.0a Access Token */
    accessToken: string;
    /** OAuth 1.0a Access Token Secret */
    accessSecret: string;
}

/**
 * Post Search Criteria
 */
export interface PostSearchCriteria {
    /** Minimum view count */
    minViews: number;
    /** Maximum age in hours */
    maxAgeHours: number;
    /** Keywords to search for (OR logic) */
    keywords?: string[];
    /** Keywords to exclude */
    excludeKeywords?: string[];
    /** Minimum follower count for authors */
    authorFollowerMin?: number;
    /** Maximum follower count for authors */
    authorFollowerMax?: number;
    /** Languages to include */
    languages?: string[];
    /** Include replies in search */
    includeReplies?: boolean;
    /** Include retweets in search */
    includeRetweets?: boolean;
}

/**
 * Safety Check Configuration
 */
export interface SafetyChecks {
    /** Require manual approval before posting */
    requireManualApproval: boolean;
    /** Minimum confidence score to post (0-100) */
    minimumConfidenceScore: number;
    /** Maximum risk level allowed */
    maximumRiskLevel: 'low' | 'medium' | 'high' | string;
}

/**
 * Automation Configuration
 */
export interface AutomationConfig {
    /** Whether automation is enabled */
    enabled: boolean;
    /** Maximum replies per hour */
    maxRepliesPerHour: number;
    /** Maximum replies per day */
    maxRepliesPerDay: number;
    /** Cooldown between replies (minutes) */
    cooldownBetweenReplies: number;
    /** Dry run mode (simulate without posting) */
    dryRun: boolean;
    /** Accounts to target */
    targetAccounts?: string[];
    /** Accounts to never reply to */
    blacklistedAccounts?: string[];
    /** Safety check configuration */
    safetyChecks: SafetyChecks;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOMATION STATUS & RESULTS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Post Candidate for Automation
 */
export interface PostCandidate {
    /** Tweet ID */
    id: string;
    /** Tweet text content */
    text: string;
    /** Author's handle (with @) */
    authorHandle: string;
    /** Author's display name */
    authorName: string;
    /** Creation timestamp */
    createdAt: Date;
    /** Engagement metrics */
    metrics: {
        views: number;
        likes: number;
        reposts: number;
        replies: number;
    };
    /** Calculated eligibility score (0-1) */
    eligibilityScore: number;
    /** Reasons for eligibility */
    reasons: string[];
}

/**
 * Automation Result
 */
export interface AutomationResult {
    /** Whether the operation succeeded */
    success: boolean;
    /** Original post ID */
    postId?: string;
    /** Posted reply ID (if successful) */
    replyId?: string;
    /** Strategy used (if any) */
    strategy?: ReplyStrategy;
    /** Error message (if failed) */
    error?: string;
    /** Timestamp of the operation */
    timestamp: Date;
    /** Performance metrics */
    metrics?: {
        processingTime: number;
        confidenceScore: number;
    };
}

/**
 * Circuit Breaker Status
 */
export interface CircuitBreakerStatus {
    /** Current state */
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    /** Failure count */
    failures: number;
    /** Last failure timestamp */
    lastFailure?: number;
    /** Next retry timestamp (when OPEN) */
    nextRetry?: number;
}

/**
 * Rate Limit Status
 */
export interface RateLimitStatus {
    /** Remaining tokens/requests */
    remaining: number;
    /** Total limit */
    limit: number;
    /** Utilization percentage */
    utilizationPercent: number;
}

/**
 * Cooldown Status
 */
export interface CooldownStatus {
    /** Whether cooldown is active */
    active: boolean;
    /** Remaining cooldown time in milliseconds */
    remainingMs: number;
    /** Timestamp of last reply */
    lastReplyAt?: string;
}

/**
 * Queue Status
 */
export interface QueueStatus {
    /** Current queue size */
    size: number;
    /** Maximum queue size */
    maxSize: number;
    /** Whether queue is being processed */
    isProcessing: boolean;
}

/**
 * Telemetry Metrics
 */
export interface TelemetryMetrics {
    /** Total operations in window */
    totalOperations: number;
    /** Success rate percentage */
    successRate: number;
    /** Average latency in milliseconds */
    avgLatencyMs: number;
    /** P99 latency in milliseconds */
    p99LatencyMs: number;
}

/**
 * Comprehensive Automation Status
 */
export interface AutomationStatus {
    /** Whether automation is enabled */
    enabled: boolean;
    /** Whether dry run mode is active */
    dryRun: boolean;
    /** Overall health status */
    healthy: boolean;
    /** Uptime in milliseconds */
    uptime: number;
    /** Whether credentials have been validated */
    credentialsValidated: boolean;

    /** Rate limit statuses */
    rateLimits: {
        hourly: RateLimitStatus;
        daily: RateLimitStatus;
    };

    /** Cooldown status */
    cooldown: CooldownStatus;

    /** Circuit breaker status */
    circuitBreaker: {
        state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
        failures: number;
        consecutiveSuccesses: number;
        nextRetryAt?: string;
    };

    /** Queue status */
    queue: QueueStatus;

    /** Telemetry metrics */
    telemetry: TelemetryMetrics;
}

/**
 * Queued Reply Item
 */
export interface QueuedReply {
    /** Post to reply to */
    post: PostCandidate;
    /** Priority (higher = processed first) */
    priority?: number;
    /** Scheduled execution time */
    scheduledFor?: number;
    /** Time added to queue */
    addedAt: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH CHECK
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Individual Health Check Result
 */
export interface HealthCheck {
    /** Status of the check */
    status: 'healthy' | 'unhealthy' | 'degraded' | 'unknown' | 'not_configured' | 'exhausted';
    /** Latency in milliseconds (if applicable) */
    latencyMs?: number;
    /** Error message (if unhealthy) */
    error?: string;
    /** Circuit breaker state (if applicable) */
    state?: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    /** Remaining tokens (if applicable) */
    hourlyRemaining?: number;
    dailyRemaining?: number;
}

/**
 * Complete Health Check Results
 */
export interface HealthCheckResult {
    /** Overall health status */
    healthy: boolean;
    /** Timestamp of the check */
    timestamp: string;
    /** Individual check results */
    checks: {
        readApi: HealthCheck;
        writeApi: HealthCheck;
        circuitBreaker: HealthCheck;
        rateLimits: HealthCheck;
    };
    /** Error message (if any) */
    error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM METRICS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rezolus Telemetry Metrics
 */
export interface RezolusTelemetryMetrics {
    /** Total operations in the time window */
    totalOperations: number;
    /** Success rate (0-1) */
    successRate: number;
    /** P99 latency in milliseconds */
    p99Latency: number;
    /** Error rate (0-1) */
    errorRate: number;
}

/**
 * Cache Statistics
 */
export interface CacheStats {
    /** Number of cached items */
    size: number;
}

/**
 * Rate Limiter Status
 */
export interface RateLimiterStatus {
    /** Remaining requests in current window */
    remaining: number;
    /** Time when the window resets */
    resetTime: number;
}

/**
 * Complete System Metrics
 */
export interface SystemMetrics {
    /** Rezolus telemetry */
    rezolus: RezolusTelemetryMetrics;
    /** Cache statistics */
    cache: CacheStats;
    /** Rate limiter status */
    rateLimiter: RateLimiterStatus;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Deep partial type for nested objects
 */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific keys required
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * API Error Response
 */
export interface ApiError {
    code: number;
    message: string;
    details?: string;
    retryable: boolean;
    retryAfterMs?: number;
}

/**
 * Operation Result with typed success/failure
 */
export type OperationResult<T, E = ApiError> =
    | { success: true; data: T }
    | { success: false; error: E };
