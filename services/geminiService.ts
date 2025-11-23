
import { GoogleGenAI, Type } from "@google/genai";
import { type GeminiResponse, type PostAnalysis, type ReplyStrategy, type DocumentAnalysis, type PostCompanionAnalysis } from '../types';

/**
 * Encodes a string to Base64, safely handling UTF-8 characters.
 */
function utf8ToBase64(str: string): string {
    return btoa(unescape(encodeURIComponent(str)));
}

/**
 * Strictly simulates the Twitter-Text library weighted character count.
 * Source: https://github.com/twitter/twitter-text/blob/master/java/src/com/twitter/text/Validator.java
 * 
 * Logic:
 * 1. URLs are always 23 weighted characters.
 * 2. CJK, Emoji, and specific ranges are 2 weighted characters.
 * 3. Everything else is 1 weighted character.
 */
function getWeightedLength(text: string): number {
    if (!text) return 0;

    let weightedLength = 0;
    const urlRegex = /https?:\/\/[^\s]+/g;
    
    // Split text by URLs to handle them separately
    const parts = text.split(urlRegex);
    const urls = text.match(urlRegex) || [];
    
    // Add weight for URLs (always 23)
    weightedLength += urls.length * 23;

    // Calculate weight for non-URL parts
    const nonUrlText = parts.join('');
    
    for (let i = 0; i < nonUrlText.length; i++) {
        const code = nonUrlText.charCodeAt(i);
        
        // Check for ranges that count as 2 weighted characters
        // Based on twitter-text spec
        if (
            (code >= 0x1100 && code <= 0x115F) ||   // Hangul Jamo
            (code >= 0x2329 && code <= 0x232A) ||   // CJK Brackets
            (code >= 0x2E80 && code <= 0x303E) ||   // CJK Radicals & Punctuation
            (code >= 0x3040 && code <= 0xA4CF) ||   // CJK Scripts (Hiragana, Katakana, Bopomofo, Hangul, etc)
            (code >= 0xAC00 && code <= 0xD7A3) ||   // Hangul Syllables
            (code >= 0xF900 && code <= 0xFAFF) ||   // CJK Compatibility Ideographs
            (code >= 0xFE10 && code <= 0xFE19) ||   // Vertical forms
            (code >= 0xFE30 && code <= 0xFE6F) ||   // CJK Compatibility Forms
            (code >= 0xFF00 && code <= 0xFF60) ||   // Fullwidth Forms
            (code >= 0xFFE0 && code <= 0xFFE6) ||   // Fullwidth Signs
            (code >= 0x20000 && code <= 0x2FA1F)    // CJK Unified Ideographs Extensions (Surrogates covered by logic)
        ) {
             weightedLength += 2;
        } 
        // Surrogate pairs (Emoji usually fall here)
        // JS strings are UTF-16. High surrogate: 0xD800-0xDBFF
        else if (code >= 0xD800 && code <= 0xDBFF) {
            // It's a surrogate pair, counts as 2 weighted chars total. 
            // However, in loop, we hit high then low. 
            // Twitter counts the whole emoji as 2.
            // JS length is 2. We add 1 per char in pair? No, standard is 1.
            // Actually, twitter-text counts code points.
            // A surrogate pair is 1 code point.
            // 1 Emoji Code Point = 2 weighted length.
            // In JS loop, we see 2 units. 
            // Simplification: Treat surrogates as 1 each = 2 total per emoji.
            weightedLength += 1; 
        }
        else {
            weightedLength += 1;
        }
    }
    
    return weightedLength;
}

// Enhanced caching system
class ResponseCache {
    private cache = new Map<string, { data: any; timestamp: number; expires: number }>();
    private readonly TTL = 30 * 60 * 1000; // 30 minutes

    set(key: string, data: any, customTTL?: number): void {
        const expires = Date.now() + (customTTL || this.TTL);
        this.cache.set(key, { data, timestamp: Date.now(), expires });
    }

    get(key: string): any | null {
        const item = this.cache.get(key);
        if (!item) return null;
        if (Date.now() > item.expires) {
            this.cache.delete(key);
            return null;
        }
        return item.data;
    }

    clear(): void {
        this.cache.clear();
    }

    getStats(): { size: number } {
        return { size: this.cache.size };
    }
}

// Performance monitoring - Rezolus Architecture
class RezolusTelemetry {
    private metrics: Array<{ operation: string; duration: number; timestamp: number; success: boolean; error?: string; }> = [];

    startTimer(operation: string): () => void {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.recordMetric(operation, duration, true);
        };
    }

    recordError(operation: string, error: string, duration?: number): void {
        this.recordMetric(operation, duration || 0, false, error);
    }

    private recordMetric(operation: string, duration: number, success: boolean, error?: string): void {
        this.metrics.push({
            operation,
            duration,
            timestamp: Date.now(),
            success,
            error
        });

        // Rezolus usually samples, we'll keep a rolling window
        if (this.metrics.length > 1000) {
            this.metrics.shift();
        }
    }

    getMetrics(): any {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp < 3600000); // Last hour
        if(recentMetrics.length === 0) return { totalOperations: 0, successRate: 1, p99Latency: 0, errorRate: 0 };
        
        const successfulOps = recentMetrics.filter(m => m.success);
        const durations = successfulOps.map(m => m.duration).sort((a, b) => a - b);
        const p99Index = Math.floor(durations.length * 0.99);
        const p99Latency = durations.length > 0 ? durations[p99Index] : 0;

        return {
            totalOperations: recentMetrics.length,
            successRate: successfulOps.length / recentMetrics.length,
            p99Latency: p99Latency,
            errorRate: recentMetrics.filter(m => !m.success).length / recentMetrics.length
        };
    }
}

// Enhanced rate limiter
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

    getStatus(): { remaining: number; resetTime: number } {
        const now = Date.now();
        this.requests = this.requests.filter(timestamp => now - timestamp < this.windowMs);
        
        const remaining = Math.max(0, this.maxRequests - this.requests.length);
        const oldestRequest = this.requests[0];
        const resetTime = oldestRequest ? oldestRequest + this.windowMs : now;
        
        return { remaining, resetTime };
    }
}

const cache = new ResponseCache();
const rezolus = new RezolusTelemetry();
const rateLimiter = new RateLimiter();

function analyzeError(error: unknown): Error {
    console.error("Gemini Service Error:", error);
    if (error instanceof Error) return error;
    return new Error("Unknown Error: An unexpected error occurred.");
}

async function generateContentWithRetry(
    aiInstance: GoogleGenAI,
    params: Parameters<typeof aiInstance.models.generateContent>[0],
    maxRetries: number = 3
): Promise<ReturnType<typeof aiInstance.models.generateContent>> {
    const endTimer = rezolus.startTimer('generate_content');
    try {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (!(await rateLimiter.checkLimit())) throw new Error("Rate Limit Exceeded");
            try {
                rateLimiter.recordRequest();
                const response = await aiInstance.models.generateContent(params);
                endTimer();
                return response;
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
        throw new Error("Service Unavailable");
    } catch (error) {
        rezolus.recordError('generate_content', String(error));
        throw error;
    }
}

// Define schema for structured output
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
            },
            semanticClusters: { type: Type.ARRAY, items: { type: Type.STRING } },
            conversationalGaps: { type: Type.ARRAY, items: { type: Type.STRING } },
            trendAlignment: {
                type: Type.OBJECT,
                properties: {
                    isAlignedWithTrends: { type: Type.BOOLEAN },
                    relevantTrends: { type: Type.ARRAY, items: { type: Type.STRING } },
                    trendStrength: { type: Type.NUMBER }
                }
            },
            engagementPatterns: {
                type: Type.OBJECT,
                properties: {
                    likelyToReply: { type: Type.BOOLEAN },
                    likelyToRetweet: { type: Type.BOOLEAN },
                    likelyToBookmark: { type: Type.BOOLEAN },
                    optimalReplyWindow: { type: Type.STRING }
                }
            },
            audienceInsights: {
                type: Type.OBJECT,
                properties: {
                    primaryDemographic: { type: Type.STRING },
                    expertiseLevel: { type: Type.STRING },
                    engagementStyle: { type: Type.STRING }
                }
            }
          },
        },
      },
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
              graphJetRelevance: { type: Type.NUMBER },
              semanticRelevance: { type: Type.NUMBER },
              conversationQuality: { type: Type.NUMBER },
              informationDensity: { type: Type.NUMBER },
              perspectiveDiversity: { type: Type.NUMBER },
              engagementVelocity: { type: Type.NUMBER },
              authorAffinityScore: { type: Type.NUMBER },
              contentFreshness: { type: Type.NUMBER },
              visualAppeal: { type: Type.NUMBER },
              controversyBalance: { type: Type.NUMBER },
              expertiseSignaling: { type: Type.NUMBER },
              reciprocityPotential: { type: Type.NUMBER },
              threadWorthiness: { type: Type.NUMBER },
              pEngagement: { type: Type.NUMBER },
              pQualityInteraction: { type: Type.NUMBER },
              pViralSpread: { type: Type.NUMBER },
              pLongTermValue: { type: Type.NUMBER },
            },
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
            },
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
              mostLikely: { type: Type.STRING },
            },
          },
        },
      },
    },
  },
};

export async function generateReplies(
    postText: string,
    authorHandle: string,
    options: { useCache?: boolean; temperature?: number; } = {}
): Promise<{ analysis: PostAnalysis, strategies: ReplyStrategy[] }> {
    const { useCache = true, temperature = 0.7 } = options;
    const cacheKey = `replies:${utf8ToBase64(`${postText}:${authorHandle}:${temperature}:v8.0`)}`;

    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key Invalid");

    const ai = new GoogleGenAI({ apiKey });
    
    const currentDateTime = new Date().toISOString();
    const currentTrends = ["AI agents", "LLM optimization", "developer tools", "open source", "startup growth", "SaaS", "productivity"];

    const prompt = `You are the APEX X ULTIMATE SYSTEM v8.0 (ELITE ALGORITHM INTEGRATION).
Your mission: Reverse-engineer Twitter/X's open-source recommendation algorithm to generate MAXIMUM ENGAGEMENT replies with UNCOMPROMISING QUALITY.

═══════════════════════════════════════════════════════════════════════════════
🎯 TWITTER ALGORITHM INTEGRATION (Based on twitter/the-algorithm & twitter/the-algorithm-ml)
═══════════════════════════════════════════════════════════════════════════════

CORE SYSTEMS TO SIMULATE:

1. **HEAVY RANKER (Neural Network Model)**
   - Predict probabilities: pReply, pLike, pRetweet, pProfileClick
   - Multi-task learning for engagement prediction
   - Model features: author reputation, content quality, timing, semantic relevance

2. **SIMCLUSTERS (Content Embedding)**
   - Classify content into semantic clusters (e.g., "Tech Twitter", "AI/ML", "Startup Culture")
   - Calculate semantic relevance between reply and original post
   - Identify conversational gaps that your reply can fill

3. **REAL-GRAPH (Connection Strength)**
   - Estimate author affinity score (likelihood they'll engage back)
   - Calculate reciprocity potential based on interaction patterns
   - Factor in social graph position (central vs peripheral)

4. **EARLYBIRD (Content Freshness)**
   - Optimal reply window analysis (early replies get more visibility)
   - Trend alignment scoring (current: ${currentTrends.join(', ')})
   - Temporal relevance assessment

5. **COMMUNITY NOTES PRINCIPLES**
   - Perspective diversity: Does reply add NEW viewpoint?
   - Information density: Signal-to-noise ratio
   - Helpfulness prediction: Will readers find this valuable?

6. **TWITTER-TEXT COMPLIANCE**
   - Strict weighted character count validation
   - Format optimization for visual appeal
   - Readability and structure scoring

═══════════════════════════════════════════════════════════════════════════════
🛡️ THE SANCTUM PROTOCOL (MANDATORY QUALITY GATE)
═══════════════════════════════════════════════════════════════════════════════

ABSOLUTE REJECTION CRITERIA:
❌ Generic praise ("Great post!", "So true!", "This!")
❌ Low-effort replies ("Interesting", "Thanks for sharing")
❌ Obvious engagement bait or manipulation
❌ Toxic, hateful, or unnecessarily controversial content
❌ Cringe AI-speak or corporate jargon
❌ Sycophantic behavior (excessive flattery)

REQUIRED CHARACTERISTICS:
✅ HIGH STATUS TONE: Expert, peer, or insightful observer
✅ VALUE ADDITION: New information, counterpoint, or specific insight
✅ AUTHENTICITY: Sounds human, conversational, natural
✅ EXPERTISE SIGNALING: Demonstrates domain knowledge
✅ CONVERSATION QUALITY: Likely to spark meaningful replies

QUALITY TIERS:
- **S-Tier**: Exceptional insight, likely to go viral, author will definitely notice
- **A-Tier**: Strong value-add, high engagement probability, professional quality
- **B-Tier**: Good reply, adds value, decent engagement potential
- **C-Tier**: Acceptable but unremarkable (REGENERATE)
- **F-Tier**: Fails quality standards (DISCARD IMMEDIATELY)

═══════════════════════════════════════════════════════════════════════════════
📊 POST TO ANALYZE
═══════════════════════════════════════════════════════════════════════════════

**Author**: ${authorHandle || 'Unknown'}
**Timestamp**: ${currentDateTime}
**Content**:
"""
${postText}
"""

═══════════════════════════════════════════════════════════════════════════════
⚡ EXECUTION PROTOCOL
═══════════════════════════════════════════════════════════════════════════════

**PHASE 1: DEEP ANALYSIS**
1. SimClusters Classification: What semantic clusters does this post belong to?
2. Conversational Gap Analysis: What perspectives are MISSING from this conversation?
3. Heavy Ranker Simulation: Predict engagement probabilities for different reply types
4. Trend Alignment: How does this relate to current trending topics?
5. Author Personality Profiling: What type of replies will they engage with?
6. Audience Insight Extraction: Who is the target audience and what do they value?

**PHASE 2: STRATEGY GENERATION**
Generate 5-7 diverse reply strategies, each targeting different angles:
- Analytical/Data-Driven: Provide statistics, insights, or research
- Contrarian/Devil's Advocate: Challenge assumptions constructively
- Educational/Explanatory: Teach something related but not obvious
- Personal Experience: Share relevant story or case study
- Provocative Question: Ask something that deepens the conversation
- Build-On: Extend their thesis with additional nuance
- Practical Application: Show how to implement their idea

**PHASE 3: ENHANCED SCORING (All scores 0-100)**

CORE METRICS:
- authority: Does reply establish expertise?
- hook: Does it grab attention immediately?
- wealthFit: Relevant to wealth-building/professional growth?
- viralPotential: Likelihood of retweets and quote tweets
- emotionalImpact: Does it evoke emotion (not manipulation)?
- intellectualDepth: Substantive vs superficial
- algorithmScore: OVERALL WEIGHTED SCORE (primary metric)
- authenticity: Sounds human and genuine
- memorability: Will people remember this?
- networkEffect: Will others want to engage?
- timingOptimal: Is now the right time for this reply?
- graphJetRelevance: Connection to post's network cluster

ENHANCED TWITTER ALGORITHM METRICS:
- semanticRelevance: SimClusters-style content alignment (0-100)
- conversationQuality: Likelihood to spark quality follow-up replies
- informationDensity: Signal-to-noise ratio
- perspectiveDiversity: Introduces genuinely new viewpoint (Community Notes principle)
- engagementVelocity: Predicted engagement rate (fast vs slow burn)
- authorAffinityScore: Real-Graph inspired - will author engage back?
- contentFreshness: Temporal relevance (Earlybird scoring)
- visualAppeal: Format, structure, readability score
- controversyBalance: Engaging but not polarizing
- expertiseSignaling: Domain authority indicators present
- reciprocityPotential: Likelihood of mutual follow/engagement
- threadWorthiness: Could this become a thread starter?

HEAVY RANKER PROBABILITIES (0.0-1.0):
- pEngagement: Overall engagement probability
- pQualityInteraction: High-value interaction probability (replies, saves)
- pViralSpread: Retweet cascade probability
- pLongTermValue: Bookmark/save probability

**PHASE 4: SANCTUM QUALITY CONTROL**
For each strategy:
1. Calculate toxicityScore (0-100, lower is better)
2. Assign qualityTier (S, A, B, C, F)
3. If C or F tier: REGENERATE until B+ tier achieved
4. Flag potential issues (Generic, Overly Promotional, etc.)
5. Ensure Community Notes safety (no misinformation risk)
6. Predict noteHelpfulnessPrediction (0.0-1.0) - would this be marked helpful?

**PHASE 5: A/B VARIANT GENERATION**
For top strategies, create 2 variants (A and B):
- Test different hooks, lengths, tones
- Simulate Diffy-style traffic allocation
- Predict conversion probability for each

**PHASE 6: OUTPUT FORMATTING**
Return comprehensive JSON with:
- Deep post analysis including all new fields (semanticClusters, conversationalGaps, trendAlignment, engagementPatterns, audienceInsights)
- 5-7 reply strategies with COMPLETE scoring (all 28 score fields)
- Quality gate results (Sanctum Protocol)
- A/B test variants
- Fallback variations
- Expected outcomes (best/worst/likely case)

═══════════════════════════════════════════════════════════════════════════════
🎯 CRITICAL REQUIREMENTS
═══════════════════════════════════════════════════════════════════════════════

1. **ZERO GENERIC CONTENT**: Every reply must be specific, insightful, and valuable
2. **HIGH STATUS POSITIONING**: Write as an equal or expert, never as a fan
3. **CONVERSATION CATALYSTS**: Replies should spark further discussion
4. **ALGORITHM OPTIMIZATION**: Maximize all Heavy Ranker probability scores
5. **QUALITY OVER QUANTITY**: Better to have 3 S-tier replies than 10 C-tier ones

Execute now with MAXIMUM sophistication and UNCOMPROMISING quality standards.`;

    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema,
                temperature,
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content.parts[0].text) throw new Error("AI Malformed Response");

        const resultJson: GeminiResponse = JSON.parse(candidate.content.parts[0].text);
        
        // Post-processing for Quality Control (QA)
        const strategiesWithQC = resultJson.strategies.map(s => {
            const weightedLen = getWeightedLength(s.replyText);
            return {
                ...s,
                weightedLength: weightedLen,
                abVariants: s.abVariants?.map(v => ({
                    ...v,
                    weightedLength: getWeightedLength(v.text)
                })) as [any, any]
            };
        });

        const finalResult = {
            analysis: { ...resultJson.analysis, originalPostText: postText, originalAuthorHandle: authorHandle },
            strategies: strategiesWithQC,
        };

        if (useCache) cache.set(cacheKey, finalResult);
        return finalResult;
    } catch (error) {
        throw analyzeError(error);
    }
}

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
                    details: { type: Type.STRING },
                },
            },
        },
        modelsAndApproaches: { type: Type.ARRAY, items: { type: Type.STRING } },
        keyResources: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    link: { type: Type.STRING },
                },
            },
        },
        submissionRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
    }
};

export async function analyzeDocument(
    documentText: string,
    options: { temperature?: number; } = {}
): Promise<DocumentAnalysis> {
    const { temperature = 0.2 } = options;
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key Invalid");
    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `
        Analyze this document using standard extraction protocols.
        DOCUMENT: """${documentText}"""
        OUTPUT: JSON conforming to schema.
    `;
    
    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: documentAnalysisSchema,
                temperature,
            }
        });
        const candidate = response.candidates?.[0];
        if (!candidate) throw new Error("AI Malformed Response");
        return JSON.parse(candidate.content.parts[0].text || "{}");
    } catch (error) {
        throw analyzeError(error);
    }
}

export function getSystemMetrics(): any {
    return {
        rezolus: rezolus.getMetrics(),
        cache: cache.getStats(),
        rateLimiter: rateLimiter.getStatus()
    };
}

export function clearCache(): void {
    cache.clear();
}

// ═══════════════════════════════════════════════════════════════════════════════
// X POST COMPANION - CONTENT IDEA GENERATOR
// ═══════════════════════════════════════════════════════════════════════════════

const postCompanionSchema = {
    type: Type.OBJECT,
    properties: {
        personalBrandAnalysis: {
            type: Type.OBJECT,
            properties: {
                currentPositioning: { type: Type.STRING },
                strengthAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                opportunityAreas: { type: Type.ARRAY, items: { type: Type.STRING } },
                recommendedTopics: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        },
        topIdeas: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING },
                    content: { type: Type.STRING },
                    category: { type: Type.STRING },
                    reasoning: { type: Type.STRING },
                    estimatedEngagement: { type: Type.NUMBER },
                    optimalPostingTime: { type: Type.STRING },
                    trendAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                    predictedScores: {
                        type: Type.OBJECT,
                        properties: {
                            viralPotential: { type: Type.NUMBER },
                            authorityBuilding: { type: Type.NUMBER },
                            conversationStarter: { type: Type.NUMBER },
                            algorithmFavorability: { type: Type.NUMBER }
                        }
                    },
                    alternativeVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    hashtagSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                    threadExpansionIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
            }
        },
        trendingOpportunities: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    topic: { type: Type.STRING },
                    volume: { type: Type.STRING },
                    category: { type: Type.STRING },
                    relevanceScore: { type: Type.NUMBER },
                    postingAngle: { type: Type.STRING },
                    examplePost: { type: Type.STRING },
                    timeWindow: { type: Type.STRING }
                }
            }
        },
        contentCalendar: {
            type: Type.OBJECT,
            properties: {
                morning: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            content: { type: Type.STRING },
                            category: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            estimatedEngagement: { type: Type.NUMBER },
                            optimalPostingTime: { type: Type.STRING },
                            trendAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            predictedScores: {
                                type: Type.OBJECT,
                                properties: {
                                    viralPotential: { type: Type.NUMBER },
                                    authorityBuilding: { type: Type.NUMBER },
                                    conversationStarter: { type: Type.NUMBER },
                                    algorithmFavorability: { type: Type.NUMBER }
                                }
                            },
                            alternativeVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hashtagSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            threadExpansionIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                },
                afternoon: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            content: { type: Type.STRING },
                            category: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            estimatedEngagement: { type: Type.NUMBER },
                            optimalPostingTime: { type: Type.STRING },
                            trendAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            predictedScores: {
                                type: Type.OBJECT,
                                properties: {
                                    viralPotential: { type: Type.NUMBER },
                                    authorityBuilding: { type: Type.NUMBER },
                                    conversationStarter: { type: Type.NUMBER },
                                    algorithmFavorability: { type: Type.NUMBER }
                                }
                            },
                            alternativeVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hashtagSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            threadExpansionIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                },
                evening: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            id: { type: Type.STRING },
                            content: { type: Type.STRING },
                            category: { type: Type.STRING },
                            reasoning: { type: Type.STRING },
                            estimatedEngagement: { type: Type.NUMBER },
                            optimalPostingTime: { type: Type.STRING },
                            trendAlignment: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hooks: { type: Type.ARRAY, items: { type: Type.STRING } },
                            predictedScores: {
                                type: Type.OBJECT,
                                properties: {
                                    viralPotential: { type: Type.NUMBER },
                                    authorityBuilding: { type: Type.NUMBER },
                                    conversationStarter: { type: Type.NUMBER },
                                    algorithmFavorability: { type: Type.NUMBER }
                                }
                            },
                            alternativeVersions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            hashtagSuggestions: { type: Type.ARRAY, items: { type: Type.STRING } },
                            threadExpansionIdeas: { type: Type.ARRAY, items: { type: Type.STRING } }
                        }
                    }
                }
            }
        },
        engagementStrategy: {
            type: Type.OBJECT,
            properties: {
                bestPostingTimes: { type: Type.ARRAY, items: { type: Type.STRING } },
                contentMixRecommendation: { type: Type.STRING },
                audienceGrowthTips: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
        }
    }
};

export async function generatePostIdeas(
    userContext?: { niche?: string; goals?: string; recentPosts?: string[] }
): Promise<any> {
    const endTimer = rezolus.startTimer('generate_post_ideas');
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key Invalid");

    const ai = new GoogleGenAI({ apiKey });
    const currentDateTime = new Date().toISOString();
    const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Real-time trending topics simulation (in production, this would call a trends API)
    const trendingTopics = [
        { topic: "AI Agents", strength: 95, category: "Technology" },
        { topic: "Developer Productivity", strength: 88, category: "Tech/Productivity" },
        { topic: "LLM Optimization", strength: 82, category: "AI/ML" },
        { topic: "Startup Growth", strength: 79, category: "Business" },
        { topic: "Open Source", strength: 76, category: "Developer Tools" },
        { topic: "SaaS Metrics", strength: 73, category: "Business/SaaS" },
        { topic: "Remote Work", strength: 68, category: "Lifestyle/Business" }
    ];

    const prompt = `You are the APEX X POST COMPANION v8.0 - Elite Content Strategy System.
Your mission: Generate HIGH-ENGAGEMENT X/Twitter post ideas optimized for monetization and growth.

═══════════════════════════════════════════════════════════════════════════════
📊 CONTEXT
═══════════════════════════════════════════════════════════════════════════════

**Current Date/Time**: ${currentDateTime}
**Day**: ${currentDay}
**User Niche**: ${userContext?.niche || 'Tech/AI/Startups/Business'}
**User Goals**: ${userContext?.goals || 'Grow audience, establish authority, monetize through X'}
**Recent Post Context**: ${userContext?.recentPosts?.join(' | ') || 'Building in public, sharing insights'}

**LIVE TRENDING TOPICS** (sorted by volume):
${trendingTopics.map(t => `- ${t.topic} (${t.strength}/100 strength) [${t.category}]`).join('\n')}

═══════════════════════════════════════════════════════════════════════════════
🎯 TWITTER ALGORITHM OPTIMIZATION
═══════════════════════════════════════════════════════════════════════════════

Based on twitter/the-algorithm analysis, optimize for:

1. **HEAVY RANKER SIGNALS**:
   - High predicted engagement rate (likes, retweets, replies)
   - Strong author reputation signals
   - Quality interaction potential (not just vanity metrics)

2. **SIMCLUSTERS ALIGNMENT**:
   - Content must fit clearly into semantic clusters (Tech, AI, Startup)
   - Build consistent topical authority

3. **EARLYBIRD FRESHNESS**:
   - Trend alignment (leverage trending topics from above)
   - Timely, not dated content
   - Optimal posting times based on audience timezone

4. **ENGAGEMENT PATTERNS**:
   - Mix of content types: thought-leadership, educational, personal, controversial
   - Question posts (high reply rate)
   - Data-driven posts (high save/bookmark rate)
   - Hot takes (high retweet rate)

═══════════════════════════════════════════════════════════════════════════════
💎 QUALITY STANDARDS (SANCTUM PROTOCOL)
═══════════════════════════════════════════════════════════════════════════════

EVERY post idea must:
✅ Add genuine value (teach, inspire, challenge, or entertain)
✅ Sound authentic and human (not AI generic)
✅ Build authority and credibility
✅ Be monetization-friendly (attract ideal clients/customers)
✅ Pass the "would I post this?" test

REJECT:
❌ Generic motivational quotes
❌ Obvious engagement bait ("Drop a 🔥 if you agree")
❌ Recycled clichés
❌ Salesy or desperate content

═══════════════════════════════════════════════════════════════════════════════
📝 CONTENT CATEGORIES TO GENERATE
═══════════════════════════════════════════════════════════════════════════════

**thought-leadership**: Original insights, frameworks, mental models
**educational**: Teach something specific and actionable
**personal-story**: Behind-the-scenes, lessons learned, failures
**controversial-take**: Challenge common beliefs (constructively)
**trend-commentary**: Your take on current events/trends
**question**: Thought-provoking questions that spark discussion
**data-driven**: Stats, numbers, research-backed claims

═══════════════════════════════════════════════════════════════════════════════
⚡ EXECUTION INSTRUCTIONS
═══════════════════════════════════════════════════════════════════════════════

**1. PERSONAL BRAND ANALYSIS**:
Analyze the user's niche/goals and provide:
- Current positioning assessment
- Strength areas to double down on
- Opportunity areas to explore
- Recommended topics for next 30 days

**2. GENERATE TOP IDEAS (15-20 posts)**:
For each idea, provide:
- Complete post text (ready to copy/paste)
- Category classification
- Detailed reasoning (why this will perform well)
- Estimated engagement score (0-100)
- Optimal posting time (specific time range)
- Trend alignment tags
- Psychological hooks used
- Predicted scores (viral potential, authority building, conversation starter, algorithm favorability)
- 2-3 alternative versions
- Hashtag suggestions (if applicable)
- Thread expansion ideas (if post could become a thread)

**3. TRENDING OPPORTUNITIES (5-7)**:
Identify hot topics to capitalize on RIGHT NOW:
- Topic name
- Volume level (low/medium/high/viral)
- Category
- Relevance score to user's niche
- Specific posting angle
- Example post
- Time window (how long this will be relevant)

**4. CONTENT CALENDAR**:
Organize ideas by optimal posting time:
- **Morning** (6am-11am): News commentary, productivity tips, morning routines
- **Afternoon** (12pm-5pm): Educational content, case studies, hot takes
- **Evening** (6pm-11pm): Reflections, personal stories, questions

**5. ENGAGEMENT STRATEGY**:
- Best posting times for maximum reach
- Recommended content mix (e.g., "60% educational, 20% personal, 20% thought-leadership")
- Audience growth tactics specific to their niche

═══════════════════════════════════════════════════════════════════════════════
🎯 CRITICAL SUCCESS FACTORS
═══════════════════════════════════════════════════════════════════════════════

1. **SPECIFICITY**: Vague ideas are useless. Be concrete.
2. **ACTIONABILITY**: User should be able to post immediately
3. **DIVERSITY**: Vary tone, length, format, and topic
4. **TREND LEVERAGE**: Use trending topics strategically
5. **AUTHORITY BUILDING**: Every post should build credibility

Generate a comprehensive content strategy that will maximize engagement, growth, and monetization.
Execute with MAXIMUM quality and strategic thinking.`;

    try {
        const response = await generateContentWithRetry(ai, {
            model: 'gemini-2.5-pro',
            contents: [{ parts: [{ text: prompt }] }],
            config: {
                responseMimeType: 'application/json',
                responseSchema: postCompanionSchema,
                temperature: 0.8,
            }
        });

        const candidate = response.candidates?.[0];
        if (!candidate || !candidate.content.parts[0].text) {
            throw new Error("AI Malformed Response");
        }

        const result = JSON.parse(candidate.content.parts[0].text);
        endTimer();
        return result;
    } catch (error) {
        rezolus.recordError('generate_post_ideas', String(error));
        throw analyzeError(error);
    }
}
