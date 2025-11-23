import React, { useState } from 'react';
import { type Scores } from '../types';

interface EnhancedScorePanelProps {
    scores: Scores;
    showCompact?: boolean;
}

export function EnhancedScorePanel({ scores, showCompact = false }: EnhancedScorePanelProps) {
    const [activeCategory, setActiveCategory] = useState<'core' | 'twitter' | 'ranker'>('core');

    // Score categories for precision organization
    const coreMetrics = [
        { key: 'authority', label: 'Authority', icon: '👑', description: 'Establishes expertise' },
        { key: 'hook', label: 'Hook', icon: '🎣', description: 'Attention grabbing' },
        { key: 'wealthFit', label: 'Wealth Fit', icon: '💰', description: 'Professional growth relevance' },
        { key: 'viralPotential', label: 'Viral', icon: '🚀', description: 'Retweet likelihood' },
        { key: 'emotionalImpact', label: 'Emotion', icon: '❤️', description: 'Emotional resonance' },
        { key: 'intellectualDepth', label: 'Depth', icon: '🧠', description: 'Substantive content' },
        { key: 'authenticity', label: 'Authenticity', icon: '✨', description: 'Sounds human' },
        { key: 'memorability', label: 'Memorable', icon: '💫', description: 'Sticks in mind' },
        { key: 'networkEffect', label: 'Network', icon: '🌐', description: 'Encourages engagement' },
        { key: 'timingOptimal', label: 'Timing', icon: '⏰', description: 'Right moment' },
        { key: 'graphJetRelevance', label: 'GraphJet', icon: '📊', description: 'Network cluster alignment' },
    ];

    const twitterMetrics = [
        { key: 'semanticRelevance', label: 'Semantic', icon: '🎯', description: 'SimClusters alignment' },
        { key: 'conversationQuality', label: 'Conversation', icon: '💬', description: 'Sparks quality replies' },
        { key: 'informationDensity', label: 'Info Density', icon: '📚', description: 'Signal-to-noise ratio' },
        { key: 'perspectiveDiversity', label: 'Perspective', icon: '🔄', description: 'New viewpoint' },
        { key: 'engagementVelocity', label: 'Velocity', icon: '⚡', description: 'Fast engagement rate' },
        { key: 'authorAffinityScore', label: 'Affinity', icon: '🤝', description: 'Author will engage back' },
        { key: 'contentFreshness', label: 'Freshness', icon: '🌱', description: 'Temporal relevance' },
        { key: 'visualAppeal', label: 'Visual', icon: '👁️', description: 'Format & readability' },
        { key: 'controversyBalance', label: 'Balance', icon: '⚖️', description: 'Engaging not polarizing' },
        { key: 'expertiseSignaling', label: 'Expertise', icon: '🎓', description: 'Domain authority' },
        { key: 'reciprocityPotential', label: 'Reciprocity', icon: '🔁', description: 'Mutual follow potential' },
        { key: 'threadWorthiness', label: 'Thread', icon: '🧵', description: 'Thread starter potential' },
    ];

    const rankerMetrics = [
        { key: 'pEngagement', label: 'Engagement', icon: '📈', description: 'Overall probability', multiplier: 100 },
        { key: 'pQualityInteraction', label: 'Quality', icon: '⭐', description: 'High-value interaction', multiplier: 100 },
        { key: 'pViralSpread', label: 'Viral Spread', icon: '🌊', description: 'Retweet cascade', multiplier: 100 },
        { key: 'pLongTermValue', label: 'Long-term', icon: '💎', description: 'Bookmark/save rate', multiplier: 100 },
    ];

    const getScoreColor = (value: number) => {
        if (value >= 90) return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';
        if (value >= 80) return 'text-green-400 border-green-500/30 bg-green-500/10';
        if (value >= 70) return 'text-blue-400 border-blue-500/30 bg-blue-500/10';
        if (value >= 60) return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
        return 'text-slate-400 border-slate-500/30 bg-slate-500/10';
    };

    const getScoreGrade = (value: number) => {
        if (value >= 90) return 'S';
        if (value >= 80) return 'A';
        if (value >= 70) return 'B';
        if (value >= 60) return 'C';
        return 'D';
    };

    const renderMetricCard = (metric: any) => {
        const value = scores[metric.key as keyof Scores];
        const displayValue = metric.multiplier ? Math.round(value * metric.multiplier) : value;
        const colorClass = getScoreColor(displayValue);
        const grade = getScoreGrade(displayValue);

        return (
            <div
                key={metric.key}
                className={`group relative p-3 rounded-xl border ${colorClass} transition-all duration-300 hover:scale-105 cursor-pointer`}
                title={metric.description}
            >
                <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{metric.icon}</span>
                    <span className="text-xs font-bold opacity-50">{grade}</span>
                </div>
                <div className="text-xs font-semibold mb-1 opacity-80">{metric.label}</div>
                <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold">{displayValue}</span>
                    <span className="text-xs opacity-50">/{metric.multiplier ? '100' : '100'}</span>
                </div>

                {/* Progress bar */}
                <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div
                        className="h-full transition-all duration-500 bg-gradient-to-r from-current to-current opacity-50"
                        style={{ width: `${displayValue}%` }}
                    />
                </div>

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {metric.description}
                </div>
            </div>
        );
    };

    // Algorithm Score - Primary Display
    const algorithmScore = scores.algorithmScore || 0;
    const algorithmGrade = getScoreGrade(algorithmScore);
    const algorithmColor = getScoreColor(algorithmScore);

    if (showCompact) {
        return (
            <div className="flex items-center gap-4">
                <div className={`px-4 py-2 rounded-xl border ${algorithmColor} flex items-center gap-2`}>
                    <span className="text-sm font-semibold opacity-70">Algorithm Score</span>
                    <span className="text-2xl font-bold">{Math.round(algorithmScore)}</span>
                    <span className="text-xs font-bold opacity-50">{algorithmGrade}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Primary Score - Swiss Watch Face */}
            <div className="relative glass-card rounded-2xl p-8">
                <div className="absolute top-0 left-0 w-full h-full opacity-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl" />

                <div className="relative flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-slate-400 mb-2">PRIMARY ALGORITHM SCORE</div>
                        <div className="flex items-baseline gap-3">
                            <span className="text-6xl font-bold text-white">{Math.round(algorithmScore)}</span>
                            <span className="text-3xl text-slate-500">/100</span>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                            <span className={`px-3 py-1 rounded-full text-sm font-bold ${algorithmColor}`}>
                                GRADE {algorithmGrade}
                            </span>
                            {algorithmScore >= 90 && (
                                <span className="px-3 py-1 rounded-full text-sm font-bold text-amber-400 border border-amber-500/30 bg-amber-500/10 animate-pulse">
                                    ELITE TIER
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Circular Progress */}
                    <div className="relative w-32 h-32">
                        <svg className="transform -rotate-90 w-full h-full">
                            <circle
                                cx="64" cy="64" r="60"
                                stroke="currentColor" strokeWidth="8"
                                fill="transparent" className="text-slate-800"
                            />
                            <circle
                                cx="64" cy="64" r="60"
                                stroke="currentColor" strokeWidth="8"
                                fill="transparent"
                                strokeDasharray={377}
                                strokeDashoffset={377 - (377 * algorithmScore) / 100}
                                className={algorithmColor}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl">🎯</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Category Tabs */}
            <div className="flex gap-2">
                <button
                    onClick={() => setActiveCategory('core')}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                        activeCategory === 'core'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                    Core Metrics
                    <span className="ml-2 text-xs opacity-60">({coreMetrics.length})</span>
                </button>
                <button
                    onClick={() => setActiveCategory('twitter')}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                        activeCategory === 'twitter'
                            ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/25'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                    Twitter Algorithm
                    <span className="ml-2 text-xs opacity-60">({twitterMetrics.length})</span>
                </button>
                <button
                    onClick={() => setActiveCategory('ranker')}
                    className={`flex-1 px-4 py-3 rounded-xl font-semibold transition-all ${
                        activeCategory === 'ranker'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                >
                    Heavy Ranker
                    <span className="ml-2 text-xs opacity-60">({rankerMetrics.length})</span>
                </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {activeCategory === 'core' && coreMetrics.map(renderMetricCard)}
                {activeCategory === 'twitter' && twitterMetrics.map(renderMetricCard)}
                {activeCategory === 'ranker' && rankerMetrics.map(renderMetricCard)}
            </div>

            {/* Summary Stats */}
            <div className="glass-card rounded-xl p-4">
                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <div className="text-xs text-slate-400 mb-1">Average Score</div>
                        <div className="text-2xl font-bold text-white">
                            {Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.values(scores).length)}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 mb-1">Peak Metric</div>
                        <div className="text-2xl font-bold text-emerald-400">
                            {Math.round(Math.max(...Object.values(scores)))}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-slate-400 mb-1">Total Metrics</div>
                        <div className="text-2xl font-bold text-blue-400">28</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
