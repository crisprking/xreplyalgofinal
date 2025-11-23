import React from 'react';
import { type Scores } from '../types';

interface ScoreDisplayProps {
  scores: Scores;
}

function ScorePill({ label, score }: { label: string; score: number }) {
    const colorClass = score >= 80 ? 'bg-green-500/20 text-green-300' : score >= 60 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-red-500/20 text-red-300';
    return (
        <div className={`flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full ${colorClass}`}>
            <span>{label}</span>
            <span className="font-black">{score}</span>
        </div>
    );
}

export function ScoreDisplay({ scores }: ScoreDisplayProps) {
    const algoColor = scores.algorithmScore >= 80 ? 'text-green-400' : scores.algorithmScore >= 60 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div>
            <div className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg mb-3">
                <div className="text-sm text-slate-400 uppercase tracking-wider font-bold">Algorithm Score</div>
                <div className={`text-3xl font-black ${algoColor}`}>{scores.algorithmScore}</div>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                <ScorePill label="Hook" score={scores.hook} />
                <ScorePill label="Depth" score={scores.intellectualDepth} />
                <ScorePill label="Authority" score={scores.authority} />
                <ScorePill label="Emotion" score={scores.emotionalImpact} />
                <ScorePill label="Wealth Fit" score={scores.wealthFit} />
                <ScorePill label="Viral" score={scores.viralPotential} />
            </div>
        </div>
    );
}