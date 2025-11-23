
import React, { useState } from 'react';
import { type ReplyStrategy, type ABVariant } from '../types';
import { GauntletDisplay } from './GauntletDisplay';
import { ClipboardIcon, CheckIcon, ChevronDownIcon, ChevronUpIcon, StarIcon, RiskIcon } from './icons/Icons';

interface ReplyCardProps {
    strategy: ReplyStrategy;
    isRecommended: boolean;
    originalPostText: string;
    originalAuthorHandle: string;
}

// Twitter-style circular progress for character count
const CharacterCountCircle = ({ weightedLength }: { weightedLength: number }) => {
    const max = 280;
    const radius = 10;
    const circumference = 2 * Math.PI * radius;
    const progress = Math.min(weightedLength / max, 1);
    const dashoffset = circumference - progress * circumference;
    
    let color = 'text-blue-500';
    if (weightedLength > 260) color = 'text-yellow-500';
    if (weightedLength > 280) color = 'text-red-500';

    return (
        <div className="relative w-6 h-6 flex items-center justify-center">
            <svg className="transform -rotate-90 w-full h-full">
                <circle
                    cx="12" cy="12" r={radius}
                    stroke="currentColor" strokeWidth="3"
                    fill="transparent" className="text-slate-800"
                />
                <circle
                    cx="12" cy="12" r={radius}
                    stroke="currentColor" strokeWidth="3"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    className={color}
                    strokeLinecap="round"
                />
            </svg>
        </div>
    );
};

export function ReplyCard({ strategy, isRecommended, originalPostText, originalAuthorHandle }: ReplyCardProps) {
    const strategyMeta: Record<string, { name: string; icon: string }> = {
        quantitative: { name: 'Quantitative Signal', icon: '📊' },
        'first-principles': { name: 'First Principles', icon: '🎯' },
        institutional: { name: 'Institutional', icon: '🏛️' },
        contrarian: { name: 'Contrarian', icon: '⚡' },
        historical: { name: 'Historical', icon: '📜' },
        'risk-opportunity': { name: 'Risk/Reward', icon: '⚖️' },
        predictive: { name: 'Predictive', icon: '🔮' },
        surgical: { name: 'Surgical', icon: '🔪' },
        'lead-lag': { name: 'Lead-Lag', icon: '⏱️' },
        memetic: { name: 'Memetic Hook', icon: '🔥' },
        default: { name: 'General Strategy', icon: '💡' }
    };

    const [isPackageCopied, setIsPackageCopied] = useState(false);
    const [isReplyCopied, setIsReplyCopied] = useState(false);
    const [isExpanded, setIsExpanded] = useState(isRecommended);
    const [selectedVariant, setSelectedVariant] = useState<'primary' | 'A' | 'B'>('primary');

    const { name, icon } = strategyMeta[(strategy.strategy || 'default').toLowerCase().replace(/\s/g, '-')] || strategyMeta.default;
    
    // Logic to handle variants
    let currentText = strategy.replyText;
    let currentLen = strategy.weightedLength;
    
    if (selectedVariant === 'A' && strategy.abVariants?.[0]) {
        currentText = strategy.abVariants[0].text;
        currentLen = strategy.abVariants[0].weightedLength;
    } else if (selectedVariant === 'B' && strategy.abVariants?.[1]) {
        currentText = strategy.abVariants[1].text;
        currentLen = strategy.abVariants[1].weightedLength;
    }

    const handleCopyReply = () => {
        navigator.clipboard.writeText(currentText);
        setIsReplyCopied(true);
        setTimeout(() => setIsReplyCopied(false), 2500);
    };

    const riskColor = (strategy.riskAssessment || 'low').toLowerCase().includes('low') ? 'text-green-400' : strategy.riskAssessment?.toLowerCase().includes('medium') ? 'text-yellow-400' : 'text-red-400';

    return (
        <div className={`glass-card rounded-2xl transition-all duration-300 ${isRecommended ? 'shadow-2xl shadow-amber-500/10 border-amber-400/50' : ''}`}>
            <div className="p-5">
                {isRecommended && (
                    <div className="flex items-center gap-2 text-amber-400 font-bold text-xs mb-3 animate-pulse uppercase tracking-wider">
                        <StarIcon className="w-4 h-4" />
                        <span>Algo Recommended — GraphJet Optimized</span>
                    </div>
                )}
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <span className="text-3xl">{icon}</span>
                        <div>
                            <h3 className="text-lg font-bold text-white">{name}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <span className="bg-slate-800 px-2 py-0.5 rounded">Graph Score: {strategy.scores?.graphJetRelevance ?? 0}</span>
                                {strategy.gauntletResults?.communityNotesSafe && <span className="text-green-400 flex items-center gap-1"><CheckIcon className="w-3 h-3"/> Note Safe</span>}
                            </div>
                        </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-semibold ${riskColor}`}>
                        <RiskIcon className="w-3 h-3"/>
                        {strategy.riskAssessment}
                    </div>
                </div>

                {/* Diffy A/B Testing Tabs */}
                {strategy.abVariants && strategy.abVariants.length >= 2 && (
                    <div className="mb-3">
                        <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Diffy Traffic Allocation</div>
                        <div className="flex gap-1 bg-slate-900/50 p-1 rounded-lg w-fit">
                            <button 
                                onClick={() => setSelectedVariant('primary')}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${selectedVariant === 'primary' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Control
                            </button>
                            <button 
                                onClick={() => setSelectedVariant('A')}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${selectedVariant === 'A' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Var A ({strategy.abVariants[0]?.trafficAllocation ?? 0}%)
                            </button>
                            <button 
                                onClick={() => setSelectedVariant('B')}
                                className={`px-3 py-1 text-xs font-semibold rounded transition-all ${selectedVariant === 'B' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                            >
                                Var B ({strategy.abVariants[1]?.trafficAllocation ?? 0}%)
                            </button>
                        </div>
                    </div>
                )}

                <div className="relative group">
                    <p className="p-4 bg-slate-950/40 rounded-lg text-slate-100 text-base leading-relaxed border border-slate-700/50 font-medium min-h-[80px]">
                        {currentText}
                    </p>
                    <div className="absolute bottom-2 right-2 opacity-50 group-hover:opacity-100 transition-opacity">
                         <button onClick={handleCopyReply} className="p-1.5 bg-slate-800 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white transition-colors">
                             {isReplyCopied ? <CheckIcon className="w-4 h-4 text-green-400"/> : <ClipboardIcon className="w-4 h-4"/>}
                         </button>
                    </div>
                </div>

                <div className="flex justify-between items-center text-sm mt-3">
                    <div className="flex items-center gap-3">
                        <CharacterCountCircle weightedLength={currentLen} />
                        <span className={`font-mono text-xs ${currentLen > 280 ? 'text-red-400' : 'text-slate-400'}`}>
                            {currentLen} / 280
                        </span>
                        {currentLen >= 71 && currentLen <= 100 && (
                          <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-800/50">
                            OPTIMAL
                          </span>
                        )}
                    </div>
                    <div className="text-xs text-slate-500">
                         p(Reply): <strong className="text-cyan-400">{(strategy.authorReplyProbability ?? 0).toFixed(0)}%</strong>
                    </div>
                </div>
            </div>
            
            <div className="bg-slate-950/30 px-5 py-2 border-t border-slate-800/50 rounded-b-2xl flex justify-between items-center">
                 <span className="text-xs text-slate-500 font-mono">v7.3 Algo</span>
                <button onClick={() => setIsExpanded(!isExpanded)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-wider py-1">
                    <span>Deep Dive</span>
                    {isExpanded ? <ChevronUpIcon className="w-3 h-3" /> : <ChevronDownIcon className="w-3 h-3" />}
                </button>
            </div>
            
            {isExpanded && (
                <div className="p-5 border-t border-slate-800/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
                    <GauntletDisplay strategy={strategy} />
                    <div>
                        <h4 className="font-bold text-cyan-400 text-xs mb-2 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                            GraphJet Insight
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed pl-3 border-l-2 border-cyan-900/50">{strategy.reasoning}</p>
                    </div>
                    {selectedVariant !== 'primary' && strategy.abVariants && strategy.abVariants.length >= 2 && (
                        <div>
                             <h4 className="font-bold text-purple-400 text-xs mb-2 uppercase tracking-wider flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-purple-400 rounded-full"></span>
                                Variant Logic (Diffy)
                            </h4>
                             <p className="text-slate-300 text-sm leading-relaxed pl-3 border-l-2 border-purple-900/50">
                                {selectedVariant === 'A' ? strategy.abVariants[0]?.rationale : strategy.abVariants[1]?.rationale}
                             </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
