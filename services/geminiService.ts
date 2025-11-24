
import { GoogleGenAI, Type } from "@google/genai";
import { type GeminiResponse, type PostAnalysis, type ReplyStrategy, type DocumentAnalysis } from '../types';

// ═══════════════════════════════════════════════════════════════════════════════
// APEX GEMINI SERVICE v8.0 - "HOROLOGICAL PRECISION EDITION"
// AI-Powered Reply Generation with Swiss-Watch Quality Control
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Encodes a string to Base64, safely handling UTF-8 characters.
 */
function utf8ToBase64(str: string): string {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch {
        // Fallback for edge cases
        return btoa(str.replace(/[^\x00-\x7F]/g, ''));
    }
}

/**
 * Twitter-Text Weighted Character Counter
 * Strictly implements the Twitter-Text library specification
 * Source: https://github.com/twitter/twitter-text
 *
 * Rules:
 * 1. URLs are always 23 weighted characters (t.co shortening)
 * 2. CJK characters are 2 weighted characters each
 * 3. Emoji (surrogate pairs) are handled as single code points
 * 4. Everything else is 1 weighted character
 */
function getWeightedLength(text: string): number {
    if (!text) return 0;

    let weightedLength = 0;

    // URL regex - matches http/https URLs
    const urlRegex = /https?:\/\/[^\s]+/g;

    // Split text by URLs to handle them separately
    const parts = text.split(urlRegex);
    const urls = text.match(urlRegex) || [];

    // Add weight for URLs (always 23 per Twitter spec)
    weightedLength += urls.length * 23;

    // Calculate weight for non-URL parts
    const nonUrlText = parts.join('');

    // Use Unicode-aware iteration
    const codePoints = [...nonUrlText];

    for (const char of codePoints) {
        const code = char.codePointAt(0) || 0;

        // CJK and special ranges that count as 2 weighted characters
        if (
            (code >= 0x1100 && code <= 0x115F) ||   // Hangul Jamo
            (code >= 0x2329 && code <= 0x232A) ||   // CJK Brackets
            (code >= 0x2E80 && code <= 0x303E) ||   // CJK Radicals & Punctuation
            (code >= 0x3040 && code <= 0xA4CF) ||   // CJK Scripts
            (code >= 0xAC00 && code <= 0xD7A3) ||   // Hangul Syllables
            (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
            (code >= 0xFE10 && code <= 0xFE19) ||   // Vertical forms
            (code >= 0xFE30 && code <= 0xFE6F) ||   // CJK Compatibility Forms
            (code >= 0xFF00 && code <= 0xFF60) ||   // Fullwidth Forms
            (code >= 0xFFE0 && code <= 0xFFE6) ||   // Fullwidth Signs
            (code >= 0x20000 && code <= 0x2FA1F)    // CJK Extensions
        ) {
            weightedLength += 2;
        } else {
            weightedLength += 1;
        }
    }

    return weightedLength;
}

/**
 * Validate reply text for Twitter compliance
 */
function validateReplyText(text: string): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const weightedLen = getWeightedLength(text);

    if (weightedLen > 280) {
        issues.push(`Exceeds 280 character limit (${weightedLen} weighted chars)`);
    }

    if (weightedLen < 10) {
        issues.push('Reply is too short (minimum 10 characters recommended)');
    }

    // Check for engagement bait patterns
    const engagementBaitPatterns = [
        /^(great|amazing|awesome|love|so true|this|exactly|100%|facts|real)/i,
        /^@\w+\s+(is|are)\s+(right|correct|wrong)/i,
        /follow\s+me|check\s+my\s+bio|link\s+in\s+bio/i
    ];

    for (const pattern of engagementBaitPatterns) {
        if (pattern.test(text)) {
            issues.push('Contains potential engagement bait pattern');
            break;
        }
    }

    // Check for excessive caps
    const capsRatio = (text.match(/[A-Z]/g) || []).length / text.length;
    if (capsRatio > 0.5 && text.length > 20) {
        issues.push('Excessive use of capital letters');
    }

    // Check for excessive punctuation
    if (/[!?]{3,}/.test(text)) {
        issues.push('Excessive punctuation');
    }

    return {
        valid: issues.length === 0,
        issues
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// CACHING SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * LRU Cache with TTL for Response Caching
 * Implements Least Recently Used eviction with time-based expiry
 */
class ResponseCache {
    private cache = new Map<string, { data: any; timestamp: number; expires: number; accessCount: number }>();
    private readonly TTL: number;
    private readonly maxSize: number;

    constructor(ttlMs: number = 30 * 60 * 1000, maxSize: number = 100) {
        this.TTL = ttlMs;
        this.maxSize = maxSize;
    }

    set(key: string, data: any, customTTL?: number): void {
        // Evict if at capacity
        if (this.cache.size >= this.maxSize) {
            this.evictLRU();
        }

        const expires = Date.now() + (customTTL || this.TTL);
        this.cache.set(key, { data, timestamp: Date.now(), expires, accessCount: 1 });
    }

    get(key: string): any | null {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }

        // Update access count for LRU
        item.accessCount++;
        return item.data;
    }

    private evictLRU(): void {
        let lruKey: string | null = null;
        let lruAccessCount = Infinity;

        for (const [key, value] of this.cache) {
            if (value.accessCount < lruAccessCount) {
                lruAccessCount = value.accessCount;
                lruKey = key;
            }
        }

        if (lruKey) {
            this.cache.delete(lruKey);
        }
    }

    clear(): void {
        this.cache.clear();
    }

    getStats(): { size: number; hitRate?: number } {
        return { size: this.cache.size };
    }

    prune(): number {
        const now = Date.now();
        let pruned = 0;

        for (const [key, value] of this.cache) {
            if (now > value.expires) {
                this.cache.delete(key);
                pruned++;
            }
        }

        return pruned;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// TELEMETRY SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rezolus-Inspired Telemetry System
 * Provides observability with percentile latency tracking
 */
class RezolusTelemetry {
    private metrics: Array<{
        operation: string;
        duration: number;
        timestamp: number;
        success: boolean;
        error?: string;
        metadata?: Record<string, any>;
    }> = [];

    private readonly maxMetrics: number = 2000;
    private readonly windowMs: number = 3600000; // 1 hour

    startTimer(operation: string, metadata?: Record<string, any>): () => void {
        const start = performance.now();
        return (error?: string) => {
            const duration = performance.now() - start;
            this.recordMetric(operation, duration, !error, error, metadata);
        };
    }

    recordError(operation: string, error: string, duration?: number): void {
        this.recordMetric(operation, duration || 0, false, error);
    }

    private recordMetric(
        operation: string,
        duration: number,
        success: boolean,
        error?: string,
        metadata?: Record<string, any>
    ): void {
        this.metrics.push({
            operation,
            duration,
            timestamp: Date.now(),
            success,
            error,
            metadata
        });

        // Maintain rolling window
        if (this.metrics.length > this.maxMetrics) {
            this.metrics = this.metrics.slice(-this.maxMetrics);
        }
    }

    getMetrics(): {
        totalOperations: number;
        successRate: number;
        p99Latency: number;
        errorRate: number;
        avgLatency: number;
        p50Latency: number;
        p95Latency: number;
        operationBreakdown: Record<string, { count: number; avgLatency: number }>;
    } {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < this.windowMs);

        if (recentMetrics.length === 0) {
            return {
                totalOperations: 0,
                successRate: 1,
                p99Latency: 0,
                errorRate: 0,
                avgLatency: 0,
                p50Latency: 0,
                p95Latency: 0,
                operationBreakdown: {}
            };
        }

        const successfulOps = recentMetrics.filter(m => m.success);
        const durations = successfulOps.map(m => m.duration).sort((a, b) => a - b);

        // Calculate percentiles
        const percentile = (arr: number[], p: number): number => {
            if (arr.length === 0) return 0;
            const index = Math.ceil(arr.length * p) - 1;
            return arr[Math.max(0, index)];
        };

        // Operation breakdown
        const operationBreakdown: Record<string, { count: number; avgLatency: number }> = {};
        for (const m of recentMetrics) {
            if (!operationBreakdown[m.operation]) {
                operationBreakdown[m.operation] = { count: 0, avgLatency: 0 };
            }
            operationBreakdown[m.operation].count++;
            operationBreakdown[m.operation].avgLatency =
                (operationBreakdown[m.operation].avgLatency * (operationBreakdown[m.operation].count - 1) + m.duration) /
                operationBreakdown[m.operation].count;
        }

        return {
            totalOperations: recentMetrics.length,
            successRate: successfulOps.length / recentMetrics.length,
            p99Latency: percentile(durations, 0.99),
            errorRate: (recentMetrics.length - successfulOps.length) / recentMetrics.length,
            avgLatency: durations.length > 0
                ? durations.reduce((a, b) => a + b, 0) / durations.length
                : 0,
            p50Latency: percentile(durations, 0.5),
            p95Latency: percentile(durations, 0.95),
            operationBreakdown
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RATE LIMITER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sliding Window Rate Limiter
 * Prevents API quota exhaustion
 */
class RateLimiter {
    private requests: number[] = [];
    private readonly windowMs: number;
    private readonly maxRequests: number;

    constructor(maxRequests: number = 60, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    async checkLimit(): Promise<boolean> {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        return this.requests.length < this.maxRequests;
    }

    recordRequest(): void {
        this.requests.push(Date.now());
    }

    getStatus(): { remaining: number; resetTime: number; utilizationPercent: number } {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);

        const remaining = Math.max(0, this.maxRequests - this.requests.length);
        const oldestRequest = this.requests[0];
        const resetTime = oldestRequest ? oldestRequest + this.windowMs : now;

        return {
            remaining,
            resetTime,
            utilizationPercent: ((this.maxRequests - remaining) / this.maxRequests) * 100
        };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SINGLETON INSTANCES
// ─────────────────────────────────────────────────────────────────────────────

const cache = new ResponseCache(30 * 60 * 1000, 200);
const rezolus = new RezolusTelemetry();
const rateLimiter = new RateLimiter(60, 60000);

// ─────────────────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Transform raw errors into user-friendly messages
 */
function analyzeError(error: unknown): Error {
    console.error("Gemini Service Error:", error);

    if (error instanceof Error) {
        const message = error.message.toLowerCase();

        if (message.includes('api key')) {
            return new Error("API_KEY_INVALID: The Gemini API key is invalid or missing. Please check your configuration.");
        }
        if (message.includes('quota') || message.includes('rate')) {
            return new Error("RATE_LIMIT_EXCEEDED: API quota exceeded. Please wait before retrying.");
        }
        if (message.includes('safety')) {
            return new Error("SAFETY_BLOCK: Content was blocked by safety filters. Try rephrasing the input.");
        }
        if (message.includes('timeout') || message.includes('network')) {
            return new Error("NETWORK_ERROR: Unable to reach the AI service. Please check your connection.");
        }
        if (message.includes('overloaded') || message.includes('503')) {
            return new Error("SERVICE_OVERLOADED: The AI service is experiencing high traffic. Please try again later.");
        }

        return error;
    }

    return new Error("UNKNOWN_ERROR: An unexpected error occurred while processing your request.");
}

// ─────────────────────────────────────────────────────────────────────────────
// RETRY LOGIC
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate content with automatic retry and exponential backoff
 */
async function generateContentWithRetry(
    aiInstance: GoogleGenAI,
    params: Parameters<typeof aiInstance.models.generateContent>[0],
    maxRetries: number = 3
): Promise<ReturnType<typeof aiInstance.models.generateContent>> {
    const endTimer = rezolus.startTimer('generate_content');

    try {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            // Check rate limit
            if (!(await rateLimiter.checkLimit())) {
                throw new Error("RATE_LIMIT_EXCEEDED: Too many requests. Please wait.");
            }

            try {
                rateLimiter.recordRequest();
                const response = await aiInstance.models.generateContent(params);
                endTimer();
                return response;
            } catch (error) {
                const isRetryable = error instanceof Error && (
                    error.message.includes('503') ||
                    error.message.includes('overloaded') ||
                    error.message.includes('timeout') ||
                    error.message.includes('network')
                );

                if (!isRetryable || attempt === maxRetries) {
                    throw error;
                }

                // Exponential backoff with jitter
                const baseDelay = 1000 * Math.pow(2, attempt);
                const jitter = baseDelay * 0.3 * Math.random();
                const delay = baseDelay + jitter;

                console.log(`⏳ Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }

        throw new Error("SERVICE_UNAVAILABLE: Max retries exceeded");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        endTimer(errorMessage);
        throw error;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSE SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Structured output schema for Gemini API
 * Ensures consistent, type-safe responses
 */
const responseSchema = {
    type: Type.OBJECT,
    properties: {
        analysis: {
            type: Type.OBJECT,
            properties: {
                wordCount: { type: Type.NUMBER },
                sophistication: { type: Type.STRING },
                tone: { type: Type.STRING },
                deconstruction: {
                    type: Type.OBJECT,
                    properties: {
                        coreThesis: { type: Type.STRING },
                        subtextAndImplications: { type: Type.STRING },
                        targetAudienceProfile: { type: Type.STRING },
                        psychologicalHooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                        strategicOpenings: { type: Type.ARRAY, items: { type: Type.STRING } },
                        emotionalTone: { type: Type.STRING },
                        urgencyLevel: { type: Type.STRING },
                        controversyRisk: { type: Type.STRING },
                        authorPersonality: { type: Type.STRING },
                        temporalRelevance: { type: Type.STRING },
                        graphInfluence: { type: Type.STRING },
                        graphJetContext: {
                            type: Type.OBJECT,
                            properties: {
                                cluster: { type: Type.STRING },
                                centrality: { type: Type.NUMBER },
                                interactionVelocity: { type: Type.STRING }
                            }
                        },
                        heavyRankerFeatures: {
                            type: Type.OBJECT,
                            properties: {
                                pReply: { type: Type.NUMBER },
                                pLike: { type: Type.NUMBER },
                                pRetweet: { type: Type.NUMBER },
                                pProfileClick: { type: Type.NUMBER },
                                authorReputation: { type: Type.NUMBER }
                            }
                        }
                    }
                }
            }
        },
        strategies: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    strategy: { type: Type.STRING },
                    replyText: { type: Type.STRING },
                    charCount: { type: Type.NUMBER },
                    strategicAngle: { type: Type.STRING },
                    riskAssessment: { type: Type.STRING },
                    scores: {
                        type: Type.OBJECT,
                        properties: {
                            authority: { type: Type.NUMBER },
                            hook: { type: Type.NUMBER },
                            wealthFit: { type: Type.NUMBER },
                            viralPotential: { type: Type.NUMBER },
                            emotionalImpact: { type: Type.NUMBER },
                            intellectualDepth: { type: Type.NUMBER },
                            algorithmScore: { type: Type.NUMBER },
                            authenticity: { type: Type.NUMBER },
                            memorability: { type: Type.NUMBER },
                            networkEffect: { type: Type.NUMBER },
                            timingOptimal: { type: Type.NUMBER },
                            graphJetRelevance: { type: Type.NUMBER }
                        }
                    },
                    gauntletResults: {
                        type: Type.OBJECT,
                        properties: {
                            novelty: { type: Type.BOOLEAN },
                            impact: { type: Type.BOOLEAN },
                            quality: { type: Type.BOOLEAN },
                            authorReply: { type: Type.BOOLEAN },
                            brandSafety: { type: Type.BOOLEAN },
                            contextualRelevance: { type: Type.BOOLEAN },
                            scalabilityPotential: { type: Type.BOOLEAN },
                            communityNotesSafe: { type: Type.BOOLEAN },
                            noteHelpfulnessPrediction: { type: Type.NUMBER },
                            sanctum: {
                                type: Type.OBJECT,
                                properties: {
                                    isSafe: { type: Type.BOOLEAN },
                                    toxicityScore: { type: Type.NUMBER },
                                    qualityTier: { type: Type.STRING },
                                    flags: { type: Type.ARRAY, items: { type: Type.STRING } }
                                }
                            }
                        }
                    },
                    abVariants: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.STRING },
                                text: { type: Type.STRING },
                                weightedLength: { type: Type.NUMBER },
                                predictedConversion: { type: Type.NUMBER },
                                rationale: { type: Type.STRING },
                                trafficAllocation: { type: Type.NUMBER }
                            }
                        }
                    },
                    scoreRationale: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    confidence: { type: Type.NUMBER },
                    authorReplyProbability: { type: Type.NUMBER },
                    strategyCategory: { type: Type.STRING },
                    optimalTiming: { type: Type.STRING },
                    fallbackVariations: { type: Type.ARRAY, items: { type: Type.STRING } },
                    riskMitigation: { type: Type.STRING },
                    expectedOutcomes: {
                        type: Type.OBJECT,
                        properties: {
                            bestCase: { type: Type.STRING },
                            worstCase: { type: Type.STRING },
                            mostLikely: { type: Type.STRING }
                        }
                    }
                }
            }
        }
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// SANCTUM PROTOCOL PROMPT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * The Sanctum Protocol - Elite Quality Control System
 * Zero tolerance for low-quality, generic, or toxic content
 */
function buildSanctumPrompt(postText: string, authorHandle: string): string {
    return `You are the APEX X ULTIMATE SYSTEM v8.0 - "HOROLOGICAL PRECISION EDITION"
Engineered with the precision of Rolex, Patek Philippe, and Audemars Piguet.

Your mission: Generate strategically optimized replies that maximize engagement while maintaining elite quality standards.

═══════════════════════════════════════════════════════════════════════════════
REFERENCE ARCHITECTURE (SIMULATION)
═══════════════════════════════════════════════════════════════════════════════

1. **twitter/the-algorithm** - Heavy Ranker Simulation
   - Calculate engagement probabilities: p(Reply), p(Like), p(Retweet), p(ProfileClick)
   - Factor in author reputation and network position
   - Optimize for algorithm visibility

2. **twitter/graphjet** - Network Topology Analysis
   - Identify cluster membership (Tech Twitter, VC, Crypto, etc.)
   - Calculate node centrality (0-100)
   - Assess interaction velocity (static/rising/viral)

3. **twitter/communitynotes** - Fact-Check Adversarial Testing
   - Predict Community Notes helpfulness score
   - Ensure factual accuracy
   - Avoid misleading claims

4. **twitter/twitter-text** - Character Counting
   - Strict weighted character counting (URLs=23, CJK=2, else=1)
   - Maximum 280 weighted characters
   - Optimal range: 71-100 characters

5. **twitter/diffy** - A/B Testing Simulation
   - Generate variant replies for testing
   - Predict conversion rates
   - Allocate traffic percentages

═══════════════════════════════════════════════════════════════════════════════
THE SANCTUM PROTOCOL (MANDATORY QUALITY CONTROL)
═══════════════════════════════════════════════════════════════════════════════

You are THE SANCTUM - the ultimate gatekeeper for reply quality.

**ZERO TOLERANCE VIOLATIONS (Automatic F-Tier):**
- Generic AI-speak ("Great point!", "Absolutely!", "This is so true!")
- Engagement bait ("Follow me", "Check my bio", "RT if you agree")
- Toxic, hateful, or controversial negativity
- Factually incorrect statements
- Sycophantic praise without substance
- Excessive emojis or punctuation
- All-caps shouting
- Hollow agreement without adding value

**HIGH-STATUS REPLY REQUIREMENTS:**
- Sound like an EXPERT, PEER, or WITTY OBSERVER - never a bot or fanboy
- ADD VALUE: new information, counter-point, unique insight, or expert perspective
- Be SPECIFIC: reference concrete details from the post
- Be MEMORABLE: craft replies that stick in people's minds
- Be AUTHENTIC: sound human, have personality, show wit when appropriate

**QUALITY TIER DEFINITIONS:**
- S-Tier: Exceptional - viral potential, author reply likely, industry-changing insight
- A-Tier: Excellent - high engagement potential, adds significant value
- B-Tier: Good - solid contribution, above average quality
- C-Tier: Mediocre - acceptable but forgettable (REGENERATE)
- F-Tier: Unacceptable - violates Sanctum rules (REJECT)

**TOXICITY SCORING (0-100, lower is better):**
- 0-20: Clean, professional, high-status
- 21-40: Minor concerns, review recommended
- 41-60: Borderline, proceed with caution
- 61-80: Problematic, likely rejection
- 81-100: Toxic, automatic rejection

═══════════════════════════════════════════════════════════════════════════════
POST TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

**Author:** ${authorHandle || 'Unknown'}
**Content:** """${postText}"""

═══════════════════════════════════════════════════════════════════════════════
EXECUTION PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

1. **DECONSTRUCT** the post:
   - Identify core thesis and subtext
   - Profile the target audience
   - Find psychological hooks and strategic openings
   - Assess emotional tone, urgency, and controversy risk
   - Determine author personality type
   - Analyze GraphJet network position

2. **SIMULATE Heavy Ranker** predictions for the original post

3. **GENERATE** 3-5 diverse reply strategies:
   - Each with unique strategic angle
   - Categories: analytical, contrarian, supportive, challenging, educational
   - All replies MUST be under 280 weighted characters
   - Optimal length: 71-100 characters

4. **SCORE** each strategy on 12 dimensions (0-100):
   - authority, hook, wealthFit, viralPotential
   - emotionalImpact, intellectualDepth, algorithmScore
   - authenticity, memorability, networkEffect
   - timingOptimal, graphJetRelevance

5. **RUN SANCTUM QC** on each reply:
   - Calculate toxicity score
   - Assign quality tier
   - Flag any issues
   - If tier is C or F, REGENERATE until B+ quality

6. **GENERATE A/B VARIANTS** for top strategies (Diffy simulation)

7. **OUTPUT** structured JSON adhering to the schema

Remember: You are a precision instrument. Every reply must be crafted with the care of a master watchmaker.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN API FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate Strategic Reply Strategies
 *
 * @param postText - The X post to reply to
 * @param authorHandle - The author's handle
 * @param options - Configuration options
 * @returns Analysis and strategies
 */
export async function generateReplies(
    postText: string,
    authorHandle: string,
    options: { useCache?: boolean; temperature?: number } = {}
): Promise<{ analysis: PostAnalysis; strategies: ReplyStrategy[] }> {
    const { useCache = true, temperature = 0.5 } = options;

    // Input validation
    if (!postText || postText.trim().length === 0) {
        throw new Error("INPUT_INVALID: Post text is required");
    }

    if (postText.length > 5000) {
        throw new Error("INPUT_TOO_LONG: Post text exceeds maximum length of 5000 characters");
    }

    // Check cache
    const cacheKey = `replies:${utf8ToBase64(`${postText}:${authorHandle}:${temperature}:v8.0`)}`;
    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) {
            console.log("📦 Cache hit for reply generation");
            return cached;
        }
    }

    // Get API key
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY_MISSING: Gemini API key is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildSanctumPrompt(postText, authorHandle);

    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema,
                temperature: Math.max(0.1, Math.min(temperature, 1.0))
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts?.[0]?.text) {
            throw new Error("AI_RESPONSE_EMPTY: No content returned from AI model");
        }

        const resultJson: GeminiResponse = JSON.parse(candidate.content.parts[0].text);

        // Post-processing and validation
        const strategiesWithQC = resultJson.strategies
            .map(s => {
                const weightedLen = getWeightedLength(s.replyText);
                const validation = validateReplyText(s.replyText);

                return {
                    ...s,
                    weightedLength: weightedLen,
                    charCount: s.replyText.length,
                    // Apply validation issues to sanctum flags
                    gauntletResults: {
                        ...s.gauntletResults,
                        sanctum: {
                            ...s.gauntletResults?.sanctum,
                            flags: [
                                ...(s.gauntletResults?.sanctum?.flags || []),
                                ...validation.issues
                            ]
                        }
                    },
                    abVariants: s.abVariants?.map(v => ({
                        ...v,
                        weightedLength: getWeightedLength(v.text)
                    })) as [any, any]
                };
            })
            // Filter out strategies with validation issues (quality gate)
            .filter(s => {
                const hasBlockingIssues = s.gauntletResults?.sanctum?.flags?.some(
                    (f: string) => f.includes('Exceeds 280') || f.includes('engagement bait')
                );
                return !hasBlockingIssues;
            });

        // Ensure we have at least one valid strategy
        if (strategiesWithQC.length === 0) {
            throw new Error("QUALITY_GATE_FAILED: All generated strategies failed quality checks. Please try again.");
        }

        const finalResult = {
            analysis: {
                ...resultJson.analysis,
                originalPostText: postText,
                originalAuthorHandle: authorHandle
            },
            strategies: strategiesWithQC
        };

        // Cache the result
        if (useCache) {
            cache.set(cacheKey, finalResult);
        }

        return finalResult;

    } catch (error) {
        throw analyzeError(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCUMENT ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

const documentAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        title: { type: Type.STRING },
        summary: { type: Type.STRING },
        objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
        milestones: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    date: { type: Type.STRING },
                    event: { type: Type.STRING },
                    details: { type: Type.STRING }
                }
            }
        },
        modelsAndApproaches: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyResources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    link: { type: Type.STRING },
                    description: { type: Type.STRING }
                }
            }
        },
        submissionRequirements: { type: Type.ARRAY, items: { type: Type.STRING } }
    }
};

/**
 * Analyze a document and extract structured information
 *
 * @param documentText - The document to analyze
 * @param options - Configuration options
 * @returns Structured document analysis
 */
export async function analyzeDocument(
    documentText: string,
    options: { temperature?: number } = {}
): Promise<DocumentAnalysis> {
    const { temperature = 0.2 } = options;

    if (!documentText || documentText.trim().length === 0) {
        throw new Error("INPUT_INVALID: Document text is required");
    }

    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY_MISSING: Gemini API key is not configured");
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analyze this document thoroughly and extract structured information.

DOCUMENT:
"""
${documentText}
"""

Extract and return:
1. Title - The document's main title or subject
2. Summary - A concise executive summary (2-3 sentences)
3. Objectives - Key objectives or goals mentioned
4. Milestones - Important dates, events, and deadlines
5. Models and Approaches - Technical approaches, methodologies, or frameworks mentioned
6. Key Resources - Important resources, links, or references
7. Submission Requirements - Any requirements for submissions or deliverables

Return structured JSON adhering to the schema.`;

    try {
        const endTimer = rezolus.startTimer('analyze_document');

        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: documentAnalysisSchema,
                temperature
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate?.content?.parts?.[0]?.text) {
            throw new Error("AI_RESPONSE_EMPTY: No content returned from AI model");
        }

        endTimer();
        return JSON.parse(candidate.content.parts[0].text);

    } catch (error) {
        throw analyzeError(error);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// SYSTEM METRICS & UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get comprehensive system metrics
 */
export function getSystemMetrics(): {
    rezolus: ReturnType<typeof rezolus.getMetrics>;
    cache: ReturnType<typeof cache.getStats>;
    rateLimiter: ReturnType<typeof rateLimiter.getStatus>;
} {
    return {
        rezolus: rezolus.getMetrics(),
        cache: cache.getStats(),
        rateLimiter: rateLimiter.getStatus()
    };
}

/**
 * Clear the response cache
 */
export function clearCache(): void {
    cache.clear();
    console.log("🗑️ Response cache cleared");
}

/**
 * Prune expired cache entries
 */
export function pruneCache(): number {
    const pruned = cache.prune();
    console.log(`🧹 Pruned ${pruned} expired cache entries`);
    return pruned;
}

/**
 * Get weighted character length for a text
 */
export function getTextWeightedLength(text: string): number {
    return getWeightedLength(text);
}

/**
 * Validate a reply text
 */
export function validateReply(text: string): { valid: boolean; issues: string[]; weightedLength: number } {
    const validation = validateReplyText(text);
    return {
        ...validation,
        weightedLength: getWeightedLength(text)
    };
}
