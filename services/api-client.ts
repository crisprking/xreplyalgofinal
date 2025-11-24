/**
 * API Client for communicating with the backend server
 * Handles all X/Twitter API calls through the backend to avoid CORS and Node.js issues
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface SearchCriteria {
    minViews: number;
    maxAgeHours: number;
    keywords?: string[];
    excludeKeywords?: string[];
    authorFollowerMin?: number;
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

export interface XCredentials {
    bearerToken: string;
    appKey?: string;
    appSecret?: string;
    accessToken?: string;
    accessSecret?: string;
}

/**
 * Search for viral posts on X using the backend API
 */
export async function searchPosts(
    bearerToken: string,
    criteria: SearchCriteria
): Promise<PostCandidate[]> {
    const response = await fetch(`${API_BASE_URL}/api/x/search`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bearerToken, criteria }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Search failed with status ${response.status}`);
    }

    const data = await response.json();
    return data.candidates;
}

/**
 * Post a reply to a tweet using the backend API
 */
export async function postReply(
    credentials: XCredentials,
    postId: string,
    replyText: string
): Promise<{ success: boolean; replyId?: string }> {
    const response = await fetch(`${API_BASE_URL}/api/x/reply`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ credentials, postId, replyText }),
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Reply failed with status ${response.status}`);
    }

    return await response.json();
}

/**
 * Check if the backend server is healthy
 */
export async function checkServerHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/health`);
        return response.ok;
    } catch {
        return false;
    }
}
