
// Enhanced type definitions for APEX X Ultimate System v8.0 - Elite Algorithm Integration

export interface Scores {
    // Core Twitter Algorithm Metrics
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
    graphJetRelevance: number;

    // Enhanced Twitter Algorithm Features (from the-algorithm research)
    semanticRelevance: number; // SimClusters-inspired content alignment
    conversationQuality: number; // Likelihood to spark quality replies
    informationDensity: number; // Signal-to-noise ratio
    perspectiveDiversity: number; // Introduces new viewpoint (Community Notes principle)
    engagementVelocity: number; // Predicted engagement rate
    authorAffinityScore: number; // Real-Graph inspired connection strength
    contentFreshness: number; // Temporal relevance (Earlybird feature)
    visualAppeal: number; // Format and readability score
    controversyBalance: number; // Engaging but not polarizing
    expertiseSignaling: number; // Domain authority indicators
    reciprocityPotential: number; // Likelihood author engages back
    threadWorthiness: number; // Potential to become a thread starter

    // Heavy Ranker Inspired Probabilities
    pEngagement: number; // Overall engagement probability
    pQualityInteraction: number; // High-value interaction probability
    pViralSpread: number; // Retweet cascade probability
    pLongTermValue: number; // Bookmark/save probability
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
        cluster: string;
        centrality: number;
        interactionVelocity: 'static' | 'rising' | 'viral';
    };
    heavyRankerFeatures: HeavyRankerFeatures;

    // Enhanced Analysis Features
    semanticClusters: string[]; // SimClusters-style topic classification
    conversationalGaps: string[]; // Missing perspectives for high-value replies
    trendAlignment: {
        isAlignedWithTrends: boolean;
        relevantTrends: string[];
        trendStrength: number; // 0-100
    };
    engagementPatterns: {
        likelyToReply: boolean;
        likelyToRetweet: boolean;
        likelyToBookmark: boolean;
        optimalReplyWindow: string; // e.g., "next 2-4 hours"
    };
    audienceInsights: {
        primaryDemographic: string;
        expertiseLevel: 'beginner' | 'intermediate' | 'expert';
        engagementStyle: 'casual' | 'professional' | 'technical';
    };
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

// X Post Companion Types
export interface PostIdea {
    id: string;
    content: string;
    category: 'thought-leadership' | 'educational' | 'personal-story' | 'controversial-take' | 'trend-commentary' | 'question' | 'data-driven';
    reasoning: string;
    estimatedEngagement: number; // 0-100
    optimalPostingTime: string;
    trendAlignment: string[];
    hooks: string[];
    predictedScores: {
        viralPotential: number;
        authorityBuilding: number;
        conversationStarter: number;
        algorithmFavorability: number;
    };
    alternativeVersions: string[];
    hashtagSuggestions: string[];
    threadExpansionIdeas?: string[];
}

export interface TrendingTopic {
    topic: string;
    volume: 'low' | 'medium' | 'high' | 'viral';
    category: string;
    relevanceScore: number;
    postingAngle: string;
    examplePost: string;
    timeWindow: string; // "next 6 hours", "today", etc.
}

export interface PostCompanionAnalysis {
    personalBrandAnalysis: {
        currentPositioning: string;
        strengthAreas: string[];
        opportunityAreas: string[];
        recommendedTopics: string[];
    };
    topIdeas: PostIdea[];
    trendingOpportunities: TrendingTopic[];
    contentCalendar: {
        morning: PostIdea[];
        afternoon: PostIdea[];
        evening: PostIdea[];
    };
    engagementStrategy: {
        bestPostingTimes: string[];
        contentMixRecommendation: string;
        audienceGrowthTips: string[];
    };
}
