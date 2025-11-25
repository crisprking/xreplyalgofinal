
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
    // NEW v7.5: Monetization-focused scores (X pays based on Premium user engagement)
    premiumEngagementPotential: number; // 0-100: Likelihood to attract Premium/verified user engagement
    bookmarkPotential: number; // 0-100: Likelihood to be bookmarked (weighted in X monetization)
    conversationStarterScore: number; // 0-100: Ability to start threads (more engagement = more $)
    thoughtLeaderAlignment: number; // 0-100: Appeals to Premium demographics (tech, finance, business)
    monetizationScore: number; // 0-100: COMPOSITE score optimized for X revenue sharing
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
    // NEW v7.5: Monetization-optimized search criteria
    requireVerifiedAuthor?: boolean; // Only target Premium/verified accounts
    prioritizeVerified?: boolean; // Boost verified authors in ranking (default: true)
    targetNiches?: ('tech' | 'finance' | 'crypto' | 'business' | 'creator')[]; // High-Premium-density niches
    minEngagementRate?: number; // Minimum engagement rate (higher = more active Premium audience)
    preferLowReplyCount?: boolean; // Less competition = better visibility for your reply
    maxReplyCount?: number; // Cap reply count to avoid getting buried
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
    // NEW v7.5: Premium/monetization tracking
    authorIsVerified: boolean; // Blue checkmark (Premium subscriber)
    authorFollowerCount: number;
    estimatedPremiumAudienceRatio: number; // 0-1: Estimated % of author's audience that is Premium
    monetizationPotential: number; // 0-100: Overall monetization potential of replying to this post
    premiumEngagementLikelihood: number; // 0-1: Probability reply will get Premium user engagement
    niche: 'tech' | 'finance' | 'crypto' | 'business' | 'creator' | 'politics' | 'entertainment' | 'other';
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
