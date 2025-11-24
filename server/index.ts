import express from 'express';
import cors from 'cors';
import { TwitterApi } from 'twitter-api-v2';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Health check
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Search for candidate posts
app.post('/api/x/search', async (req, res) => {
    try {
        const { bearerToken, criteria } = req.body;

        if (!bearerToken) {
            return res.status(400).json({ error: 'Bearer token is required' });
        }

        const client = new TwitterApi(bearerToken).readOnly;

        // Build search query
        let searchQuery = (criteria.keywords && criteria.keywords.length > 0
            ? criteria.keywords.join(' OR ')
            : '(AI OR startup OR tech OR business)') + ' -is:retweet -is:reply';

        if (criteria.excludeKeywords && criteria.excludeKeywords.length > 0) {
            searchQuery += ' ' + criteria.excludeKeywords.map((k: string) => `-${k}`).join(' ');
        }

        console.log(`[X API] Searching with query: ${searchQuery}`);

        const searchResults = await client.v2.search(searchQuery, {
            max_results: 100,
            'tweet.fields': ['created_at', 'public_metrics', 'author_id'],
            'user.fields': ['username', 'name', 'public_metrics', 'verified'],
            expansions: ['author_id']
        });

        const candidates: any[] = [];
        const users = searchResults.includes?.users || [];

        if (!searchResults.data.data) {
            return res.json({ candidates: [] });
        }

        for (const tweet of searchResults.data.data) {
            const author = users.find(user => user.id === tweet.author_id);
            if (!author) continue;

            const ageHours = (Date.now() - new Date(tweet.created_at!).getTime()) / 3600000;
            if (ageHours > (criteria.maxAgeHours || 24)) continue;

            const metrics = tweet.public_metrics!;
            const authorMetrics = author.public_metrics!;

            // Skip posts below minimum view threshold
            const viewCount = metrics.impression_count || 0;
            if (criteria.minViews && viewCount < criteria.minViews) {
                continue;
            }

            if (criteria.authorFollowerMin && authorMetrics.followers_count < criteria.authorFollowerMin) {
                continue;
            }

            // Calculate eligibility score
            const engagementRate = (metrics.like_count + metrics.retweet_count * 2 + metrics.reply_count * 3) / (authorMetrics.followers_count || 1);
            const followerScore = Math.log10(Math.max(authorMetrics.followers_count, 1)) / 8;
            const recencyBonus = Math.max(0, (24 - ageHours) / 24) * 0.2;
            const eligibilityScore = Math.min(engagementRate * 1000, 0.4) + Math.min(followerScore, 0.3) + recencyBonus;

            if (eligibilityScore < 0.5) continue;

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
                eligibilityScore,
                reasons: getEligibilityReasons(metrics, authorMetrics, eligibilityScore)
            });
        }

        // Sort by eligibility and return top 20
        const sortedCandidates = candidates
            .sort((a, b) => b.eligibilityScore - a.eligibilityScore)
            .slice(0, 20);

        console.log(`[X API] Found ${sortedCandidates.length} candidates with ${criteria.minViews}+ views`);
        res.json({ candidates: sortedCandidates });

    } catch (error: any) {
        console.error('[X API] Search error:', error);

        let errorMessage = 'Failed to search posts';
        if (error.code === 401) {
            errorMessage = 'Invalid Bearer Token. Please check your credentials.';
        } else if (error.code === 429) {
            errorMessage = 'Rate limit exceeded. Please wait and try again.';
        } else if (error.message) {
            errorMessage = error.message;
        }

        res.status(500).json({ error: errorMessage });
    }
});

// Post a reply
app.post('/api/x/reply', async (req, res) => {
    try {
        const { credentials, postId, replyText } = req.body;

        if (!credentials.appKey || !credentials.appSecret || !credentials.accessToken || !credentials.accessSecret) {
            return res.status(400).json({ error: 'Full OAuth credentials are required to post replies' });
        }

        const client = new TwitterApi({
            appKey: credentials.appKey,
            appSecret: credentials.appSecret,
            accessToken: credentials.accessToken,
            accessSecret: credentials.accessSecret,
        });

        console.log(`[X API] Posting reply to ${postId}: "${replyText.substring(0, 50)}..."`);

        const result = await client.v2.reply(replyText, postId);

        console.log(`[X API] Reply posted successfully: ${result.data.id}`);
        res.json({ success: true, replyId: result.data.id });

    } catch (error: any) {
        console.error('[X API] Reply error:', error);

        let errorMessage = 'Failed to post reply';
        if (error.code === 401) {
            errorMessage = 'Invalid credentials. Please check your API keys.';
        } else if (error.code === 403) {
            errorMessage = 'Forbidden. Your app may not have write permissions.';
        } else if (error.code === 429) {
            errorMessage = 'Rate limit exceeded. Please wait and try again.';
        } else if (error.data?.detail) {
            errorMessage = error.data.detail;
        }

        res.status(500).json({ error: errorMessage });
    }
});

function getEligibilityReasons(postMetrics: any, authorMetrics: any, score: number): string[] {
    const reasons = [];
    if (score > 0.7) reasons.push('High engagement');
    if (authorMetrics.followers_count > 100000) reasons.push('Influential author');
    if (postMetrics.reply_count < 20) reasons.push('Low reply competition');
    return reasons;
}

app.listen(PORT, () => {
    console.log(`[Server] X API Backend running on http://localhost:${PORT}`);
    console.log(`[Server] Endpoints:`);
    console.log(`         POST /api/x/search - Search for viral posts`);
    console.log(`         POST /api/x/reply  - Post a reply`);
});
