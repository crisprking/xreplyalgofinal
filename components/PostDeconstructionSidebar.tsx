
import React from 'react';
import { type PostAnalysis } from '../types';

interface PostDeconstructionSidebarProps {
  analysis: PostAnalysis;
}

interface StatCardProps {
    label: string;
    value: string | number;
    colorClass?: string;
}

function StatCard({ label, value, colorClass = "text-white" }: StatCardProps) {
    return (
        <div className="bg-slate-800/50 p-3 rounded-lg text-center border border-slate-700/30">
            <div className={`text-lg font-bold ${colorClass}`}>{value}</div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{label}</div>
        </div>
    );
}

interface DeconstructionItemProps {
    title: string;
    children?: React.ReactNode;
    isRepo?: boolean;
}

function DeconstructionItem({ title, children, isRepo }: DeconstructionItemProps) {
    return (
        <div>
            <h4 className={`text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2 ${isRepo ? 'text-purple-400' : 'text-cyan-400'}`}>
                {title}
                {isRepo && <span className="text-[9px] bg-purple-500/10 text-purple-300 px-1.5 py-0.5 rounded border border-purple-500/20">OPEN SOURCE</span>}
            </h4>
            <div className="text-sm text-slate-300 space-y-2">{children}</div>
        </div>
    );
}

export function PostDeconstructionSidebar({ analysis }: PostDeconstructionSidebarProps) {
  const { wordCount, sophistication, tone, deconstruction } = analysis;
  const {
      coreThesis = 'N/A',
      psychologicalHooks = [],
      strategicOpenings = [],
      emotionalTone = 'neutral',
      urgencyLevel = 'low',
      controversyRisk = 'minimal',
      authorPersonality = 'analyst',
      graphInfluence = 'peripheral',
      graphJetContext = { cluster: 'General', centrality: 50, interactionVelocity: 'static' },
      heavyRankerFeatures
  } = deconstruction || {};

  const safeHeavyRanker = heavyRankerFeatures || { pReply: 0, pLike: 0, pRetweet: 0, pProfileClick: 0, authorReputation: 0 };

  const sophColor = {
      EXPERT: 'text-purple-400',
      HIGH: 'text-blue-400',
      MEDIUM: 'text-green-400',
      LOW: 'text-yellow-400'
  }[sophistication] || 'text-blue-400';

  return (
    <aside className="sticky top-8 space-y-6">
      <div className="p-5 glass-card rounded-2xl border border-slate-700/50">
        <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-widest opacity-70">Target Deconstruction</h3>
        
        <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Words" value={wordCount} />
            <StatCard label="Level" value={sophistication} colorClass={sophColor} />
            <StatCard label="Tone" value={tone} />
        </div>

        <div className="space-y-6">
            
            <DeconstructionItem title="GraphJet Topology" isRepo>
                 <div className="p-3 bg-purple-900/10 rounded-lg border border-purple-500/20 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Cluster</span>
                        <span className="font-bold text-purple-200 text-sm">{graphJetContext.cluster}</span>
                    </div>
                    <div>
                        <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-400">Node Centrality</span>
                            <span className="text-purple-300">{graphJetContext.centrality}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-purple-500 rounded-full" 
                                style={{ width: `${graphJetContext.centrality}%` }}
                            ></div>
                        </div>
                    </div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-400 text-xs">Velocity</span>
                        <span className={`font-bold text-xs px-2 py-0.5 rounded-full ${graphJetContext.interactionVelocity === 'viral' ? 'bg-red-500/20 text-red-300' : 'bg-slate-700 text-slate-300'}`}>
                            {graphJetContext.interactionVelocity.toUpperCase()}
                        </span>
                    </div>
                 </div>
            </DeconstructionItem>

            <DeconstructionItem title="Heavy Ranker Features" isRepo>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="bg-slate-800/50 p-2 rounded">
                        <div className="text-slate-400">p(Reply)</div>
                        <div className="text-white font-bold">{((safeHeavyRanker.pReply || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                        <div className="text-slate-400">p(Like)</div>
                        <div className="text-white font-bold">{((safeHeavyRanker.pLike || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                        <div className="text-slate-400">p(RT)</div>
                        <div className="text-white font-bold">{((safeHeavyRanker.pRetweet || 0) * 100).toFixed(1)}%</div>
                    </div>
                    <div className="bg-slate-800/50 p-2 rounded">
                        <div className="text-slate-400">Reputation</div>
                        <div className="text-white font-bold">{safeHeavyRanker.authorReputation || 0}/100</div>
                    </div>
                </div>
            </DeconstructionItem>

            <DeconstructionItem title="Core Thesis">
                <p className="p-3 bg-slate-800/30 rounded-lg border border-slate-700/30 text-sm italic text-slate-300">{coreThesis}</p>
            </DeconstructionItem>
            
            <div className="grid grid-cols-2 gap-4">
                 <DeconstructionItem title="Emotion">
                    <p className="font-semibold capitalize text-white">{emotionalTone}</p>
                </DeconstructionItem>
                 <DeconstructionItem title="Personality">
                    <p className="font-semibold capitalize text-white">{authorPersonality}</p>
                </DeconstructionItem>
            </div>

            <DeconstructionItem title="Hooks">
                <div className="flex flex-wrap gap-1.5">
                    {psychologicalHooks.map((hook) => (
                    <span key={hook} className="px-2.5 py-1 bg-cyan-950 text-cyan-300 border border-cyan-800/50 rounded-md text-[10px] font-medium uppercase tracking-wide">
                        {hook}
                    </span>
                    ))}
                </div>
            </DeconstructionItem>
        </div>
      </div>
    </aside>
  );
}
