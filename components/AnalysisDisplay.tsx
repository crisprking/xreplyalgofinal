import React from 'react';
import { type PostAnalysis, type ReplyStrategy } from '../types';
import { PostDeconstructionSidebar } from './PostDeconstructionSidebar';
import { ReplyCard } from './ReplyCard';

interface AnalysisDisplayProps {
  analysis: PostAnalysis;
  strategies: ReplyStrategy[];
}

export const AnalysisDisplay = React.memo(function AnalysisDisplay({ analysis, strategies }: AnalysisDisplayProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start mt-8">
      <div className="lg:col-span-1">
        <PostDeconstructionSidebar analysis={analysis} />
      </div>
      <div className="lg:col-span-2 space-y-6">
        {strategies.map((strategy, index) => (
          <div key={strategy.strategy + index}>
            <ReplyCard
              strategy={strategy}
              isRecommended={index === 0}
              originalPostText={analysis.originalPostText}
              originalAuthorHandle={analysis.originalAuthorHandle}
            />
          </div>
        ))}
      </div>
    </div>
  );
});
