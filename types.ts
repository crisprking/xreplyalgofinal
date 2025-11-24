
// Enhanced type definitions for APEX X Ultimate System v7.4

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
        cluster: string; // e.g., "Tech Twitter", "Crypto", "Politics"
        centrality: number; // 0-100
        interactionVelocity: 'static' | 'rising' | 'viral';
    };
    heavyRankerFeatures: HeavyRankerFeatures;
}

export interface PostAnalysis {
    wordCount: number;
    sophistication: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXPERT';
    tone: string;
    detectedLanguage?: string; // Language detected in the original post (ISO 639-1 or full name)
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
