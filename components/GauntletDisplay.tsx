
import React from 'react';
import { type ReplyStrategy } from '../types';
import { CheckIcon, RiskIcon } from './icons/Icons';

interface GauntletDisplayProps {
  strategy: ReplyStrategy;
}

export function GauntletDisplay({ strategy }: GauntletDisplayProps) {
    const { scores = {} as any, gauntletResults = {} as any, authorReplyProbability = 0 } = strategy;
    const algoScore = scores.algorithmScore || 0;
    const algoColor = algoScore >= 80 ? 'text-green-400' : algoScore >= 60 ? 'text-yellow-400' : 'text-red-400';
    const sanctum = gauntletResults.sanctum || { isSafe: true, toxicityScore: 0, qualityTier: 'A', flags: [] };

    const gauntletItems = [
        {
            label: "Sanctum Protocol",
            passed: sanctum.isSafe,
            description: `Quality Tier: ${sanctum.qualityTier} | Toxicity: ${sanctum.toxicityScore}%`,
            flags: sanctum.flags
        },
        {
            label: "Community Notes Safety",
            passed: gauntletResults.communityNotesSafe ?? true, 
            description: gauntletResults.communityNotesSafe ? "Low risk of context notes" : "HIGH RISK: Check facts"
        },
        {
            label: "Novelty Check",
            passed: gauntletResults.novelty ?? false,
            description: `Cuts through noise (Score: ${scores.authenticity || 'N/A'}/100)`
        },
        {
            label: "Impact Check",
            passed: gauntletResults.impact ?? false,
            description: `High substance & authority`
        },
        {
            label: "GraphJet Relevance",
            passed: (scores.graphJetRelevance || 0) > 70,
            description: `Centrality Score: ${scores.graphJetRelevance || 0}/100`
        },
        {
            label: "Brand Safety",
            passed: gauntletResults.brandSafety ?? false,
            description: "Low risk of misinterpretation"
        },
    ];

    return (
        <div className="space-y-3">
            <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg">
                <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">Algorithm Score</div>
                <div className={`text-3xl font-black ${algoColor}`}>{algoScore}</div>
            </div>
            
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-300 mb-2 text-center uppercase tracking-wider flex items-center justify-center gap-2">
                   <span className="text-purple-400">✦</span> Apex Gauntlet v7.4 <span className="text-purple-400">✦</span>
                </h3>
                <div className="grid grid-cols-1 gap-2">
                    {gauntletItems.map((item) => (
                        <div key={item.label} className={`flex items-start gap-3 p-3 rounded-lg ${item.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                            <div className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5 ${item.passed ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-400'}`}>
                                {item.passed ? <CheckIcon className="w-3 h-3" strokeWidth={4} /> : <span className="font-bold text-sm">!</span>}
                            </div>
                            <div>
                                <h4 className={`font-bold text-sm ${item.passed ? 'text-green-300' : 'text-red-300'}`}>{item.label}</h4>
                                <p className="text-xs text-slate-400">{item.description}</p>
                                {item.flags && item.flags.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {item.flags.map(flag => (
                                            <span key={flag} className="text-[9px] px-1.5 py-0.5 bg-red-900/40 text-red-300 rounded border border-red-800/30">{flag}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
