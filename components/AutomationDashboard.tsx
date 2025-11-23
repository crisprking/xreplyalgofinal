
import React from 'react';
import {
    type XApiCredentials,
    type AutomationConfig,
    type PostSearchCriteria,
    type PostCandidate,
    type AutomationResult
} from '../types';
import {
    RiskIcon,
    SparklesIcon
} from './icons/Icons';

interface AutomationDashboardProps {
    credentials: XApiCredentials | null;
    onCredentialsChange: (field: keyof XApiCredentials, value: string) => void;
    config: AutomationConfig;
    onConfigChange: (config: Partial<AutomationConfig>) => void;
    searchCriteria: PostSearchCriteria;
    onSearchCriteriaChange: (criteria: PostSearchCriteria) => void;
    automationStatus: any;
    candidatePosts: PostCandidate[];
    automationResults: AutomationResult[];
    isRunning: boolean;
    onFindCandidates: () => void;
    onRunAutomation: () => void;
}

export const AutomationDashboard = React.memo(function AutomationDashboard({
    credentials,
    onCredentialsChange,
    config,
    onConfigChange,
    searchCriteria,
    onSearchCriteriaChange,
    automationStatus,
    candidatePosts,
    automationResults,
    isRunning,
    onFindCandidates,
    onRunAutomation
}: AutomationDashboardProps) {

    const handleConfigChange = (field: keyof AutomationConfig, value: any) => {
        onConfigChange({ [field]: value });
    };
    
    const handleSafetyCheckChange = (field: keyof AutomationConfig['safetyChecks'], value: any) => {
        onConfigChange({ safetyChecks: { ...config.safetyChecks, [field]: value } });
    }

    const formatTime = (date: Date) => new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(date);

    const getMissingCredentials = () => {
        const missing = [];
        if (!credentials?.appKey) missing.push('App Key');
        if (!credentials?.appSecret) missing.push('App Secret');
        if (!credentials?.accessToken) missing.push('Access Token');
        if (!credentials?.accessSecret) missing.push('Access Secret');
        return missing;
    };
    
    const missingForReply = getMissingCredentials();
    const canFindCandidates = !!credentials?.bearerToken;
    const canAutomate = canFindCandidates && missingForReply.length === 0;

    const automationButtonTitle = !canFindCandidates 
        ? "Bearer Token is required."
        : !canAutomate
        ? `Missing for replies: ${missingForReply.join(', ')}`
        : config.dryRun
        ? "Simulate a reply cycle without posting to X."
        : "WARNING: This will post a reply to X using your account.";

    return (
        <div className="space-y-6">
            <div className="glass-card rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <RiskIcon className="w-8 h-8 text-purple-400" />
                        <div>
                            <h2 className="text-2xl font-bold text-white">X Automation Dashboard</h2>
                            <p className="text-slate-400">Automated high-engagement post targeting and reply generation</p>
                        </div>
                    </div>
                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${config.enabled ? (config.dryRun ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300') : 'bg-red-500/20 text-red-300'}`}>
                        {config.enabled ? (config.dryRun ? 'DRY RUN MODE' : 'LIVE MODE') : 'DISABLED'}
                    </div>
                </div>
                 <div className="bg-amber-900/30 border border-amber-500/50 rounded-2xl p-4">
                    <div className="flex items-start gap-3">
                        <RiskIcon className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-200">
                            <p className="font-semibold mb-1">Security Warning: Handle API Keys With Care</p>
                            <p className="text-amber-300/90">
                                You are entering sensitive API keys with write permissions. These are stored only in your browser's memory for this session and are not sent to any server except X's API. Close this tab to clear them.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card rounded-2xl p-4">
                        <h3 className="text-lg font-bold text-white mb-3">Controls</h3>
                        <div className="space-y-3">
                             <button onClick={onFindCandidates} disabled={isRunning || !canFindCandidates} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all" title={!canFindCandidates ? "Bearer Token is required to find candidates." : ""}>
                                <SparklesIcon className="w-5 h-5" /> {isRunning ? 'Searching...' : 'Find Candidates'}
                            </button>
                            <button 
                                onClick={onRunAutomation} 
                                disabled={isRunning || !canAutomate}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-all"
                                title={automationButtonTitle}
                            >
                                <RiskIcon className="w-5 h-5" /> {config.dryRun ? 'Run Dry Run' : 'Run Automation LIVE'}
                            </button>
                        </div>
                    </div>
                    <div className="glass-card rounded-2xl p-4">
                        <h3 className="text-lg font-bold text-white mb-3">Credentials</h3>
                        <p className="text-xs text-slate-400 mb-2">
                           Provide your full X API v2 credentials to enable automated replies. Read-only features only require the Bearer Token.
                        </p>
                        <div className="space-y-2">
                             <div>
                                <label htmlFor="bearerToken" className="text-xs text-slate-400">Bearer Token</label>
                                <input
                                    id="bearerToken"
                                    type="password" 
                                    value={credentials?.bearerToken || ''} 
                                    onChange={(e) => onCredentialsChange('bearerToken', e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-2 text-sm text-slate-200"
                                    placeholder="Required for finding posts" 
                                />
                            </div>
                            <div>
                                <label htmlFor="appKey" className="text-xs text-slate-400">App Key</label>
                                <input
                                    id="appKey"
                                    type="password" 
                                    value={credentials?.appKey || ''} 
                                    onChange={(e) => onCredentialsChange('appKey', e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-2 text-sm text-slate-200"
                                    placeholder="Required for replies" 
                                />
                            </div>
                            <div>
                                <label htmlFor="appSecret" className="text-xs text-slate-400">App Secret</label>
                                <input 
                                    id="appSecret"
                                    type="password" 
                                    value={credentials?.appSecret || ''} 
                                    onChange={(e) => onCredentialsChange('appSecret', e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-2 text-sm text-slate-200"
                                    placeholder="Required for replies" 
                                />
                            </div>
                             <div>
                                <label htmlFor="accessToken" className="text-xs text-slate-400">Access Token</label>
                                <input
                                    id="accessToken"
                                    type="password" 
                                    value={credentials?.accessToken || ''} 
                                    onChange={(e) => onCredentialsChange('accessToken', e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-2 text-sm text-slate-200"
                                    placeholder="Required for replies" 
                                />
                            </div>
                             <div>
                                <label htmlFor="accessSecret" className="text-xs text-slate-400">Access Secret</label>
                                <input
                                    id="accessSecret"
                                    type="password" 
                                    value={credentials?.accessSecret || ''} 
                                    onChange={(e) => onCredentialsChange('accessSecret', e.target.value)} 
                                    className="w-full bg-slate-900/50 border border-slate-700 rounded-md p-2 text-sm text-slate-200"
                                    placeholder="Required for replies" 
                                />
                            </div>
                        </div>
                         <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 block">→ Get Credentials from X Developer Portal</a>
                    </div>
                     <div className="glass-card rounded-2xl p-4">
                        <h3 className="text-lg font-bold text-white mb-3">Settings</h3>
                        <div className="space-y-3">
                             <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">Enable</span><input type="checkbox" checked={config.enabled} onChange={(e) => handleConfigChange('enabled', e.target.checked)} className="toggle" /></label>
                             <label className="flex items-center justify-between cursor-pointer"><span className="text-sm">Dry Run</span><input type="checkbox" checked={config.dryRun} onChange={(e) => handleConfigChange('dryRun', e.target.checked)} className="toggle" /></label>
                             <div className="text-sm">Max Replies/Hour: <input type="number" value={config.maxRepliesPerHour} onChange={(e) => handleConfigChange('maxRepliesPerHour', parseInt(e.target.value))} className="w-16 bg-slate-900/50 p-1 rounded" /></div>
                             <div className="text-sm">Cooldown (min): <input type="number" value={config.cooldownBetweenReplies} onChange={(e) => handleConfigChange('cooldownBetweenReplies', parseInt(e.target.value))} className="w-16 bg-slate-900/50 p-1 rounded" /></div>
                             <div className="text-sm">Min Confidence: <input type="number" value={config.safetyChecks.minimumConfidenceScore} onChange={(e) => handleSafetyCheckChange('minimumConfidenceScore', parseInt(e.target.value))} className="w-16 bg-slate-900/50 p-1 rounded" />%</div>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-6">
                     {candidatePosts.length > 0 && (
                        <div className="glass-card rounded-2xl p-4">
                            <h3 className="text-lg font-bold text-white mb-2">Top Candidates ({candidatePosts.length})</h3>
                            <div className="space-y-3 max-h-96 overflow-y-auto">
                                {candidatePosts.map((c) => (
                                    <div key={c.id} className="bg-slate-800/40 rounded-lg p-3">
                                        <div className="flex justify-between items-start text-sm mb-1">
                                            <div><span className="font-semibold text-white">{c.authorName}</span> <span className="text-slate-400">{c.authorHandle}</span></div>
                                            <div className="font-bold text-green-400">{((c.eligibilityScore ?? 0) * 100).toFixed(0)}%</div>
                                        </div>
                                        <p className="text-slate-200 text-sm leading-relaxed">{c.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {automationResults.length > 0 && (
                        <div className="glass-card rounded-2xl p-4">
                            <h3 className="text-lg font-bold text-white mb-2">Recent Results ({automationResults.length})</h3>
                             <div className="space-y-3 max-h-96 overflow-y-auto">
                                {automationResults.map((r, i) => (
                                    <div key={i} className={`p-3 rounded-lg ${r.success ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                        <div className="flex justify-between items-center text-sm mb-1">
                                            <div className={`font-bold ${r.success ? 'text-green-300' : 'text-red-300'}`}>{r.success ? (config.dryRun && !r.error ? 'Success (Dry Run)' : 'Success') : 'Failed'}</div>
                                            <div className="text-slate-400">{formatTime(r.timestamp)}</div>
                                        </div>
                                        {r.error ? <p className="text-red-300 text-sm">{r.error}</p> : <p className="text-slate-200 text-sm">"{r.strategy?.replyText}"</p>}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});
