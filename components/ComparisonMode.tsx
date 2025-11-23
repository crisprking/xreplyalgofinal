import React, { useState } from 'react';
import { type ReplyStrategy } from '../types';

interface ComparisonModeProps {
    strategies: ReplyStrategy[];
    onClose: () => void;
}

export function ComparisonMode({ strategies, onClose }: ComparisonModeProps) {
    const [selected, setSelected] = useState<number[]>([0, 1]);

    const toggleSelection = (index: number) => {
        if (selected.includes(index)) {
            setSelected(selected.filter(i => i !== index));
        } else if (selected.length < 3) {
            setSelected([...selected, index]);
        }
    };

    const selectedStrategies = selected.map(i => strategies[i]);

    const compareMetrics = [
        { key: 'algorithmScore', label: 'Algorithm', icon: '🎯' },
        { key: 'authority', label: 'Authority', icon: '👑' },
        { key: 'viralPotential', label: 'Viral', icon: '🚀' },
        { key: 'authenticity', label: 'Authentic', icon: '✨' },
        { key: 'pEngagement', label: 'Engagement', icon: '📈', multiplier: 100 },
        { key: 'conversationQuality', label: 'Conversation', icon: '💬' },
        { key: 'expertiseSignaling', label: 'Expertise', icon: '🎓' },
        { key: 'threadWorthiness', label: 'Thread', icon: '🧵' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="glass-card rounded-2xl p-8 max-w-7xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                        <span>⚖️</span> Compare Strategies
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Strategy Selector */}
                <div className="mb-8">
                    <div className="text-sm font-semibold text-slate-400 mb-3">
                        Select up to 3 strategies to compare ({selected.length}/3)
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {strategies.map((strategy, idx) => (
                            <button
                                key={idx}
                                onClick={() => toggleSelection(idx)}
                                disabled={!selected.includes(idx) && selected.length >= 3}
                                className={`p-3 rounded-xl border transition-all ${
                                    selected.includes(idx)
                                        ? 'border-blue-500 bg-blue-500/20 text-white'
                                        : 'border-slate-700 bg-slate-800/50 text-slate-400 hover:text-white hover:border-slate-600'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                <div className="text-xs font-semibold mb-1">{strategy.strategy}</div>
                                <div className="text-2xl font-bold">{Math.round(strategy.scores.algorithmScore)}</div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Comparison Table */}
                {selectedStrategies.length > 0 && (
                    <div className="space-y-6">
                        {/* Metric Comparison */}
                        <div className="glass-card rounded-xl p-6">
                            <h3 className="text-xl font-bold text-white mb-4">Metric Comparison</h3>
                            <div className="space-y-3">
                                {compareMetrics.map((metric) => (
                                    <div key={metric.key} className="grid gap-3" style={{ gridTemplateColumns: `150px repeat(${selectedStrategies.length}, 1fr)` }}>
                                        <div className="flex items-center gap-2 text-slate-300 font-semibold">
                                            <span>{metric.icon}</span>
                                            <span className="text-sm">{metric.label}</span>
                                        </div>
                                        {selectedStrategies.map((strategy, idx) => {
                                            const value = strategy.scores[metric.key as keyof typeof strategy.scores];
                                            const displayValue = metric.multiplier ? Math.round(value * metric.multiplier) : Math.round(value);
                                            const isHighest = displayValue === Math.max(...selectedStrategies.map(s => {
                                                const v = s.scores[metric.key as keyof typeof s.scores];
                                                return metric.multiplier ? Math.round(v * metric.multiplier) : Math.round(v);
                                            }));

                                            return (
                                                <div
                                                    key={idx}
                                                    className={`p-3 rounded-lg ${
                                                        isHighest ? 'bg-emerald-500/20 border border-emerald-500/50' : 'bg-slate-800/50'
                                                    }`}
                                                >
                                                    <div className="text-2xl font-bold text-white">{displayValue}</div>
                                                    <div className="w-full bg-slate-700 rounded-full h-1 mt-2">
                                                        <div
                                                            className={`h-full rounded-full ${isHighest ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                            style={{ width: `${displayValue}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Text Comparison */}
                        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${selectedStrategies.length}, 1fr)` }}>
                            {selectedStrategies.map((strategy, idx) => (
                                <div key={idx} className="glass-card rounded-xl p-6">
                                    <div className="text-xs font-semibold text-slate-400 mb-2">STRATEGY {idx + 1}</div>
                                    <div className="text-sm font-bold text-white mb-4">{strategy.strategy}</div>
                                    <div className="text-slate-300 leading-relaxed mb-4">{strategy.replyText}</div>
                                    <div className="pt-4 border-t border-slate-700">
                                        <div className="text-xs text-slate-400 mb-1">Quality Tier</div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                            strategy.gauntletResults.sanctum.qualityTier === 'S' ? 'bg-amber-500/20 text-amber-400' :
                                            strategy.gauntletResults.sanctum.qualityTier === 'A' ? 'bg-emerald-500/20 text-emerald-400' :
                                            strategy.gauntletResults.sanctum.qualityTier === 'B' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-500/20 text-slate-400'
                                        }`}>
                                            {strategy.gauntletResults.sanctum.qualityTier}-TIER
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
