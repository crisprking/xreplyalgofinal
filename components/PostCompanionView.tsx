import React, { useState } from 'react';
import { type PostCompanionAnalysis, type PostIdea } from '../types';
import { SparklesIcon, BrainCircuitIcon } from './icons/Icons';

interface PostCompanionViewProps {
    onGenerate: (context?: { niche?: string; goals?: string; recentPosts?: string[] }) => Promise<void>;
    isLoading: boolean;
    analysis: PostCompanionAnalysis | null;
    error: string | null;
}

export function PostCompanionView({ onGenerate, isLoading, analysis, error }: PostCompanionViewProps) {
    const [niche, setNiche] = useState('Tech/AI/Startups/Business');
    const [goals, setGoals] = useState('Grow audience, establish authority, monetize through X');
    const [recentPosts, setRecentPosts] = useState('');
    const [selectedIdea, setSelectedIdea] = useState<PostIdea | null>(null);
    const [activeTab, setActiveTab] = useState<'ideas' | 'trending' | 'calendar' | 'strategy'>('ideas');

    const handleGenerate = () => {
        const context = {
            niche: niche || undefined,
            goals: goals || undefined,
            recentPosts: recentPosts ? recentPosts.split('\n').filter(p => p.trim()) : undefined
        };
        onGenerate(context);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        alert('Copied to clipboard!');
    };

    const renderPostIdea = (idea: PostIdea) => (
        <div
            key={idea.id}
            className="glass-card p-4 sm:p-6 hover:border-blue-500/50 transition-all cursor-pointer"
            onClick={() => setSelectedIdea(idea)}
        >
            <div className="flex items-start justify-between mb-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    idea.category === 'thought-leadership' ? 'bg-purple-500/20 text-purple-400' :
                    idea.category === 'educational' ? 'bg-blue-500/20 text-blue-400' :
                    idea.category === 'controversial-take' ? 'bg-red-500/20 text-red-400' :
                    idea.category === 'data-driven' ? 'bg-green-500/20 text-green-400' :
                    'bg-slate-500/20 text-slate-400'
                }`}>
                    {idea.category.replace('-', ' ').toUpperCase()}
                </span>
                <div className="text-right">
                    <div className="text-2xl font-bold text-cyan-400">{idea.estimatedEngagement}</div>
                    <div className="text-xs text-slate-400">Est. Score</div>
                </div>
            </div>

            <p className="text-white mb-4 leading-relaxed">{idea.content}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                <div className="text-center p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">Viral</div>
                    <div className="text-sm font-bold text-pink-400">{idea.predictedScores.viralPotential}</div>
                </div>
                <div className="text-center p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">Authority</div>
                    <div className="text-sm font-bold text-yellow-400">{idea.predictedScores.authorityBuilding}</div>
                </div>
                <div className="text-center p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">Convo</div>
                    <div className="text-sm font-bold text-green-400">{idea.predictedScores.conversationStarter}</div>
                </div>
                <div className="text-center p-2 bg-slate-800/50 rounded">
                    <div className="text-xs text-slate-400">Algorithm</div>
                    <div className="text-sm font-bold text-blue-400">{idea.predictedScores.algorithmFavorability}</div>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-3">
                {idea.trendAlignment.map((trend, idx) => (
                    <span key={idx} className="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">
                        #{trend}
                    </span>
                ))}
            </div>

            <div className="flex gap-2 text-xs text-slate-400">
                <span>📍 {idea.optimalPostingTime}</span>
            </div>

            <button
                onClick={(e) => { e.stopPropagation(); copyToClipboard(idea.content); }}
                className="mt-4 w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-semibold"
            >
                Copy Post
            </button>
        </div>
    );

    return (
        <div className="space-y-6">
            {/* Input Section */}
            {!analysis && (
                <div className="glass-card p-6">
                    <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                        <SparklesIcon className="w-6 h-6 text-cyan-400" />
                        X Post Companion v8.0
                    </h2>
                    <p className="text-slate-400 mb-6">
                        Generate high-engagement X post ideas optimized for monetization. Powered by Twitter's algorithm insights.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Your Niche / Industry
                            </label>
                            <input
                                type="text"
                                value={niche}
                                onChange={(e) => setNiche(e.target.value)}
                                placeholder="e.g., Tech/AI/Startups/Business"
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Your Goals
                            </label>
                            <input
                                type="text"
                                value={goals}
                                onChange={(e) => setGoals(e.target.value)}
                                placeholder="e.g., Grow audience, establish authority, monetize"
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-300 mb-2">
                                Recent Posts (optional, one per line)
                            </label>
                            <textarea
                                value={recentPosts}
                                onChange={(e) => setRecentPosts(e.target.value)}
                                placeholder="Paste your recent posts for context..."
                                rows={4}
                                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none resize-none"
                            />
                        </div>

                        <button
                            onClick={handleGenerate}
                            disabled={isLoading}
                            className="w-full px-6 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>Processing...</>
                            ) : (
                                <>
                                    <BrainCircuitIcon className="w-5 h-5" />
                                    Generate Post Ideas
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Error Display */}
            {error && (
                <div className="glass-card p-6 border-red-500/50">
                    <h3 className="text-xl font-bold text-red-400 mb-2">Error</h3>
                    <p className="text-slate-300">{error}</p>
                </div>
            )}

            {/* Results */}
            {analysis && (
                <>
                    {/* Brand Analysis */}
                    <div className="glass-card p-6">
                        <h3 className="text-2xl font-bold text-white mb-4">Personal Brand Analysis</h3>
                        <div className="space-y-4">
                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Current Positioning</h4>
                                <p className="text-white">{analysis.personalBrandAnalysis.currentPositioning}</p>
                            </div>
                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <h4 className="text-sm font-semibold text-green-400 mb-2">Strengths</h4>
                                    <ul className="space-y-1">
                                        {analysis.personalBrandAnalysis.strengthAreas.map((strength, idx) => (
                                            <li key={idx} className="text-slate-300 text-sm">✓ {strength}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-yellow-400 mb-2">Opportunities</h4>
                                    <ul className="space-y-1">
                                        {analysis.personalBrandAnalysis.opportunityAreas.map((opp, idx) => (
                                            <li key={idx} className="text-slate-300 text-sm">→ {opp}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('ideas')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'ideas' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            Top Ideas ({analysis.topIdeas.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('trending')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'trending' ? 'bg-pink-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            Trending Now ({analysis.trendingOpportunities.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('calendar')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'calendar' ? 'bg-purple-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            Content Calendar
                        </button>
                        <button
                            onClick={() => setActiveTab('strategy')}
                            className={`px-4 py-2 rounded-lg font-semibold transition-all whitespace-nowrap ${
                                activeTab === 'strategy' ? 'bg-green-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                            }`}
                        >
                            Strategy
                        </button>
                    </div>

                    {/* Tab Content */}
                    {activeTab === 'ideas' && (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {analysis.topIdeas.map(renderPostIdea)}
                        </div>
                    )}

                    {activeTab === 'trending' && (
                        <div className="grid md:grid-cols-2 gap-4">
                            {analysis.trendingOpportunities.map((trend, idx) => (
                                <div key={idx} className="glass-card p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <h4 className="text-xl font-bold text-white">{trend.topic}</h4>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            trend.volume === 'viral' ? 'bg-red-500/20 text-red-400' :
                                            trend.volume === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                            'bg-blue-500/20 text-blue-400'
                                        }`}>
                                            {trend.volume.toUpperCase()}
                                        </span>
                                    </div>
                                    <div className="text-sm text-slate-400 mb-2">{trend.category}</div>
                                    <div className="mb-4">
                                        <div className="text-xs text-slate-400 mb-1">Relevance: {trend.relevanceScore}/100</div>
                                        <div className="w-full bg-slate-800 rounded-full h-2">
                                            <div
                                                className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full"
                                                style={{ width: `${trend.relevanceScore}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="text-xs font-semibold text-slate-300 mb-1">Your Angle:</div>
                                        <p className="text-sm text-slate-400">{trend.postingAngle}</p>
                                    </div>
                                    <div className="bg-slate-800/50 p-3 rounded-lg mb-3">
                                        <div className="text-xs text-slate-400 mb-1">Example:</div>
                                        <p className="text-sm text-white">{trend.examplePost}</p>
                                    </div>
                                    <div className="text-xs text-slate-500">⏰ {trend.timeWindow}</div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'calendar' && (
                        <div className="space-y-6">
                            {['morning', 'afternoon', 'evening'].map((time) => (
                                <div key={time}>
                                    <h3 className="text-xl font-bold text-white mb-4 capitalize">{time} Posts</h3>
                                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                                        {analysis.contentCalendar[time as keyof typeof analysis.contentCalendar].map(renderPostIdea)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {activeTab === 'strategy' && (
                        <div className="glass-card p-6">
                            <h3 className="text-2xl font-bold text-white mb-6">Engagement Strategy</h3>
                            <div className="space-y-6">
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-400 mb-3">Best Posting Times</h4>
                                    <div className="flex flex-wrap gap-2">
                                        {analysis.engagementStrategy.bestPostingTimes.map((time, idx) => (
                                            <span key={idx} className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-semibold">
                                                {time}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-400 mb-3">Content Mix Recommendation</h4>
                                    <p className="text-white">{analysis.engagementStrategy.contentMixRecommendation}</p>
                                </div>
                                <div>
                                    <h4 className="text-lg font-semibold text-cyan-400 mb-3">Audience Growth Tips</h4>
                                    <ul className="space-y-2">
                                        {analysis.engagementStrategy.audienceGrowthTips.map((tip, idx) => (
                                            <li key={idx} className="flex items-start gap-2 text-slate-300">
                                                <span className="text-green-400 mt-1">→</span>
                                                <span>{tip}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Regenerate Button */}
                    <button
                        onClick={() => onGenerate({ niche, goals, recentPosts: recentPosts.split('\n').filter(p => p.trim()) })}
                        className="w-full px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-bold transition-all"
                    >
                        Generate New Ideas
                    </button>
                </>
            )}

            {/* Idea Detail Modal */}
            {selectedIdea && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setSelectedIdea(null)}>
                    <div className="glass-card p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-2xl font-bold text-white mb-4">Post Details</h3>
                        <div className="space-y-4">
                            <div className="bg-slate-800/50 p-4 rounded-lg">
                                <p className="text-white text-lg">{selectedIdea.content}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Why This Works</h4>
                                <p className="text-slate-300">{selectedIdea.reasoning}</p>
                            </div>

                            <div>
                                <h4 className="text-sm font-semibold text-slate-400 mb-2">Psychological Hooks</h4>
                                <div className="flex flex-wrap gap-2">
                                    {selectedIdea.hooks.map((hook, idx) => (
                                        <span key={idx} className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-full text-sm">
                                            {hook}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {selectedIdea.alternativeVersions.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Alternative Versions</h4>
                                    {selectedIdea.alternativeVersions.map((alt, idx) => (
                                        <div key={idx} className="bg-slate-800/30 p-3 rounded-lg mb-2">
                                            <p className="text-slate-300">{alt}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selectedIdea.threadExpansionIdeas && selectedIdea.threadExpansionIdeas.length > 0 && (
                                <div>
                                    <h4 className="text-sm font-semibold text-slate-400 mb-2">Thread Expansion Ideas</h4>
                                    <ul className="space-y-1">
                                        {selectedIdea.threadExpansionIdeas.map((thread, idx) => (
                                            <li key={idx} className="text-slate-300 text-sm">{idx + 1}. {thread}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            <button
                                onClick={() => setSelectedIdea(null)}
                                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
