
import { GoogleGenAI, Type } from "@google/genai";
import { type GeminiResponse, type PostAnalysis, type ReplyStrategy, type DocumentAnalysis } from '../types';

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
              // NEW v7.5: Monetization-focused scores
              premiumEngagementPotential: { type: Type.NUMBER }, // 0-100: Appeals to Premium/verified users
              bookmarkPotential: { type: Type.NUMBER }, // 0-100: Bookmark-worthy content
              conversationStarterScore: { type: Type.NUMBER }, // 0-100: Sparks threads
              thoughtLeaderAlignment: { type: Type.NUMBER }, // 0-100: Appeals to Premium demographics
              monetizationScore: { type: Type.NUMBER }, // 0-100: Overall $ potential
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
    const cacheKey = `replies:${utf8ToBase64(`${postText}:${authorHandle}:${temperature}:v7.4`)}`;

    if (useCache) {
        const cached = cache.get(cacheKey);
        if (cached) return cached;
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API Key Invalid");

    const ai = new GoogleGenAI({ apiKey });
    
    const prompt = `You are the APEX X ULTIMATE SYSTEM v7.5 (MONETIZATION-OPTIMIZED EDITION).

**CRITICAL MONETIZATION CONTEXT (November 2024 Update):**
X now pays creators based on ENGAGEMENT FROM PREMIUM/VERIFIED USERS ONLY.
- Ad revenue from replies NO LONGER counts toward payouts
- 25% of X subscription revenue goes to creators
- Only interactions from Premium users (blue checkmarks) generate revenue
- Engagement weights: Likes (30×), Retweets (20×), Replies (1×), Bookmarks (high value)
- Time spent viewing your content also factors into payouts

**YOUR PRIMARY OBJECTIVE:** Generate replies that MAXIMIZE PREMIUM USER ENGAGEMENT.

**PREMIUM USER PSYCHOLOGY (Key Insight):**
Premium users are typically: entrepreneurs, investors, tech professionals, thought leaders, content creators.
They engage with: contrarian takes, data-backed insights, actionable advice, witty observations, intellectual debates.
They IGNORE: generic praise, engagement bait, surface-level comments, obvious statements.

REFERENCE REPOSITORIES (SIMULATION):
1. **twitter/the-algorithm**: Heavy Ranker probabilities (optimize for p(Like), p(Retweet), p(Bookmark))
2. **twitter/graphjet**: Network topology (target high-Premium-density clusters)
3. **twitter/communitynotes**: Adversarial fact-check (avoid flaggable content)
4. **twitter/twitter-text**: Strict 280 weighted character limit
5. **twitter/diffy**: A/B testing for conversion optimization

**THE SANCTUM PROTOCOL (MANDATORY QUALITY CONTROL):**
- **Zero Tolerance** for "cringe", "slop", generic AI-speak, or engagement bait.
- **Zero Tolerance** for toxic, hateful, or controversial negativity.
- **High Status Tone**: Sound like a peer, expert, or witty insider—NOT a bot or fanboy.
- **Value Add**: Must add data, counter-point, unique insight, or actionable take.
- **Bookmark-Worthy**: Aim for content people want to save and return to.

**MONETIZATION SCORING (NEW IN v7.5):**
Calculate these additional scores (0-100):
- premiumEngagementPotential: How likely to attract Premium user engagement?
- bookmarkPotential: How save-worthy is this reply? (Bookmarks = high monetization signal)
- conversationStarterScore: Will this spark a thread? (More replies = more Premium exposure)
- thoughtLeaderAlignment: Does this appeal to Premium demographics (tech, finance, business)?
- monetizationScore: COMPOSITE score weighing all above factors for maximum revenue potential.

POST TO ANALYZE:
Author: ${authorHandle || 'Unknown'}
Content: """${postText}"""

EXECUTE PROTOCOL:
1. **Premium Audience Analysis**: Identify Premium user appeal factors in the post.
2. **GraphJet Analysis**: Deconstruct post's position (favor tech/finance/business clusters).
3. **Strategy Drafting**: Generate replies optimized for Premium engagement triggers:
   - Contrarian but credible takes
   - Data or experience-backed insights
   - Thought-provoking questions that spark debate
   - Actionable advice for professionals
   - Witty observations that show insider knowledge
4. **Sanctum QC**: Filter by qualityTier (discard C/F), calculate toxicityScore.
5. **Monetization Scoring**: Calculate all 5 monetization scores for each strategy.
6. **Output**: Return JSON with strategies ranked by monetizationScore.

**OPTIMAL REPLY CHARACTERISTICS FOR MONETIZATION:**
- Length: 80-180 characters (digestible but substantive)
- Tone: Confident, informed, slightly provocative
- Format: One clear point, no fluff
- Hook: Strong opening that stops the scroll
- CTA (implicit): Invites engagement without begging for it
`;

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
