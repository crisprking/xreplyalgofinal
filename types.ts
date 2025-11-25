
// Enhanced type definitions for APEX X MONETIZATION MAXIMIZER v8.0
// Updated November 2024: Revenue-optimized for new X monetization model
// - Engagement from Premium users (not ads in replies)
// - Algorithm weights: Reply-to-reply (75x), Profile click (12x), Dwell time (10x)
// - SimClusters targeting for high Premium user density topics

export interface Scores {
    authority: number;
    hook: number;
    wealthFit: number;
    viralPotential: number;
    emotionalImpact: number;
    intellectualDepth: number;
    algorithmScore: number;
    authenticity: number;
    memorability: number;
    networkEffect: number;
    timingOptimal: number;
    graphJetRelevance: number; // Based on Twitter's GraphJet
    // NEW v8.0 Monetization-Focused Metrics
    conversationChainPotential: number; // 0-100: Likelihood of triggering reply-to-reply chain (75x boost)
    profileClickPotential: number; // 0-100: Likelihood of driving profile visits (12x boost)
    dwellTimeScore: number; // 0-100: Expected reading time engagement (10x boost for >2min)
    premiumUserAppeal: number; // 0-100: Appeal to Premium/verified users (revenue multiplier)
    revenueImpactScore: number; // 0-100: Composite monetization potential score
}

export interface SanctumCheck {
    isSafe: boolean;
    toxicityScore: number; // 0-100 (Lower is better)
    qualityTier: 'S' | 'A' | 'B' | 'C' | 'F';
    flags: string[];
}

export interface GauntletResults {
    novelty: boolean;
    impact: boolean;
    quality: boolean;
    authorReply: boolean;
    brandSafety: boolean;
    contextualRelevance: boolean;
    scalabilityPotential: boolean;
    communityNotesSafe: boolean; // based on communitynotes repo logic
    noteHelpfulnessPrediction: number; // 0.0 to 1.0
    sanctum: SanctumCheck; // New v7.4 Safety Layer
}

export interface HeavyRankerFeatures {
    pReply: number;
    pLike: number;
    pRetweet: number;
    pProfileClick: number;
    authorReputation: number;
    // NEW v8.0: 2024 Algorithm Weights
    pReplyToReply: number; // 75x boost - HIGHEST VALUE for monetization
    pQuoteTweet: number; // 2x engagement vs standard
    pBookmark: number; // High intent signal
    pDwellOver2Min: number; // 10x boost for extended reading
    premiumUserDensity: number; // 0-1: Concentration of Premium users in thread
    simClusterAlignment: number; // 0-1: Match to high-value topic clusters
    estimatedRevenueMultiplier: number; // Composite revenue potential
}

export interface PostDeconstruction {
    coreThesis: string;
    subtextAndImplications: string;
    targetAudienceProfile: string;
    psychologicalHooks: string[];
    strategicOpenings: string[];
    emotionalTone: 'positive' | 'negative' | 'neutral' | 'mixed';
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical';
    controversyRisk: 'minimal' | 'low' | 'moderate' | 'high';
    authorPersonality: 'thought-leader' | 'entrepreneur' | 'academic' | 'influencer' | 'analyst';
    temporalRelevance: 'evergreen' | 'trending' | 'breaking' | 'seasonal';
    graphInfluence: 'central' | 'peripheral' | 'bridge';
    graphJetContext: {
        cluster: string; // e.g., "Tech Twitter", "Crypto", "Politics"
        centrality: number; // 0-100
        interactionVelocity: 'static' | 'rising' | 'viral';
        // NEW v8.0: Premium User Targeting
        premiumUserDensity: 'low' | 'medium' | 'high' | 'very_high'; // Premium user concentration
        estimatedPremiumReach: number; // 0-100: % of audience that are Premium
        revenueClusterTier: 'S' | 'A' | 'B' | 'C'; // Revenue potential of this SimCluster
    };
    heavyRankerFeatures: HeavyRankerFeatures;
}

export interface PostAnalysis {
    wordCount: number;
    sophistication: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';
    tone: string;
    deconstruction: PostDeconstruction;
    originalPostText: string;
    originalAuthorHandle: string;
    estimatedReach?: number;
    postType?: 'thread' | 'single' | 'reply' | 'quote' | 'media';
    timeOfPosting?: Date;
    engagementMetrics?: {
        likes: number;
        reposts: number;
        replies: number;
        views?: number;
    };
}

export interface ABVariant {
    id: 'A' | 'B';
    text: string;
    weightedLength: number;
    predictedConversion: number; // Probability of Like/Reply
    rationale: string;
    trafficAllocation: number; // Percentage 0-100 (Diffy simulation)
}

export interface ReplyStrategy {
    strategy: string;
    replyText: string; // Primary/Winner
    charCount: number;
    weightedLength: number;
    strategicAngle: string;
    riskAssessment: string;
    scores: Scores;
    gauntletResults: GauntletResults;
    scoreRationale: string;
    reasoning: string;
    confidence: number;
    authorReplyProbability: number;
    strategyCategory: 'analytical' | 'contrarian' | 'supportive' | 'challenging' | 'educational';
    optimalTiming: string;
    fallbackVariations: string[];
    abVariants?: [ABVariant, ABVariant]; // New: A/B Testing
    riskMitigation: string;
    expectedOutcomes: {
        bestCase: string;
        worstCase: string;
        mostLikely: string;
    };
}

export interface GeminiResponse {
    analysis: Omit<PostAnalysis, 'originalPostText' | 'originalAuthorHandle'>;
    strategies: ReplyStrategy[];
}

// Document analysis types
export interface Milestone {
    date: string;
    event: string;
    details: string;
}

export interface DocumentAnalysis {
    title: string;
    summary: string;
    objectives: string[];
    milestones: Milestone[];
    modelsAndApproaches: string[];
    keyResources: { name: string; link?: string; }[];
    submissionRequirements: string[];
}

// Automation types
export interface XApiCredentials {
    bearerToken: string;
    appKey: string;
    appSecret: string;
    accessToken: string;
    accessSecret: string;
}

export interface PostSearchCriteria {
    minViews: number;
    maxAgeHours: number;
    keywords?: string[];
    excludeKeywords?: string[];
    authorFollowerMin?: number;
    authorFollowerMax?: number;
    languages?: string[];
    includeReplies?: boolean;
    includeRetweets?: boolean;
    // NEW v8.0: Premium User & Monetization Targeting
    prioritizeVerifiedAuthors?: boolean; // Target verified/Premium authors (higher Premium audience)
    premiumAudienceTopics?: string[]; // Topics with high Premium user density
    minEngagementRate?: number; // Minimum engagement rate threshold
    targetSimClusters?: string[]; // Specific SimClusters to target (e.g., "Tech", "Finance", "AI")
    revenueOptimized?: boolean; // Enable revenue-focused ranking
}

export interface AutomationConfig {
    enabled: boolean;
    maxRepliesPerHour: number;
    maxRepliesPerDay: number;
    cooldownBetweenReplies: number; // minutes
    dryRun: boolean;
    targetAccounts?: string[];
    blacklistedAccounts?: string[];
    safetyChecks: {
        requireManualApproval: boolean;
        minimumConfidenceScore: number;
        maximumRiskLevel: string;
    };
}

export interface PostCandidate {
    id: string;
    text: string;
    authorHandle: string;
    authorName: string;
    createdAt: Date;
    metrics: {
        views: number;
        likes: number;
        reposts: number;
        replies: number;
    };
    eligibilityScore: number;
    reasons: string[];
}

export interface AutomationResult {
    success: boolean;
    postId?: string;
    replyId?: string;
    strategy?: ReplyStrategy;
    error?: string;
    timestamp: Date;
    metrics?: {
        processingTime: number;
        confidenceScore: number;
    };
}

export interface CircuitBreakerStatus {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failures: number;
    lastFailure?: number;
    nextRetry?: number;
}
