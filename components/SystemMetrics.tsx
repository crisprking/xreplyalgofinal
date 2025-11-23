
import React from 'react';
import { SparklesIcon, RiskIcon } from './icons/Icons';

interface SystemMetricsProps {
    metrics: any;
    onClearCache: () => void;
}

function MetricCard({ label, value, unit = '', colorClass = 'text-white' }: { label: string; value: string | number; unit?: string; colorClass?: string }) {
    return (
        <div className="bg-slate-800/50 p-4 rounded-lg text-center border border-slate-700/30">
            <div className={`text-2xl font-bold ${colorClass}`}>
                {value}<span className="text-base text-slate-500 ml-1 font-medium">{unit}</span>
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1">{label}</div>
        </div>
    );
}

export const SystemMetrics = React.memo(function SystemMetrics({ metrics, onClearCache }: SystemMetricsProps) {
    if (!metrics) {
        return (
            <div className="glass-card rounded-2xl p-6 text-center">
                <p className="text-slate-400">Initializing system telemetry...</p>
            </div>
        );
    }

    const rezolus = metrics.rezolus || {};
    const cache = metrics.cache || {};
    const rateLimiter = metrics.rateLimiter || {};
    const circuitBreaker = metrics.automationStatus?.circuitBreaker || { state: 'CLOSED', failures: 0 };

    const successRate = rezolus.successRate ? (rezolus.successRate * 100).toFixed(1) : 'N/A';
    const errorRate = rezolus.errorRate ? (rezolus.errorRate * 100).toFixed(1) : 'N/A';
    const p99Latency = rezolus.p99Latency ? Math.round(rezolus.p99Latency) : 'N/A';

    const cbStateColors = {
        'CLOSED': 'text-green-400',
        'HALF_OPEN': 'text-yellow-400',
        'OPEN': 'text-red-500'
    };
    const cbColor = cbStateColors[circuitBreaker.state as keyof typeof cbStateColors] || 'text-slate-400';

    return (
        <div className="glass-card rounded-2xl p-6 space-y-8">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800/50">
                <SparklesIcon className="w-8 h-8 text-cyan-400" />
                <div>
                    <h2 className="text-xl font-bold text-white">Rezolus Telemetry</h2>
                    <p className="text-xs text-slate-400">Real-time system observability & resilience metrics.</p>
                </div>
            </div>

            <div>
                <h3 className="text-sm font-bold text-cyan-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                    Core Performance (P99)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <MetricCard label="Ops / Hour" value={rezolus.totalOperations ?? '0'} />
                    <MetricCard label="Success Rate" value={successRate} unit="%" colorClass="text-green-400" />
                    <MetricCard label="P99 Latency" value={p99Latency} unit="ms" />
                    <MetricCard label="Error Rate" value={errorRate} unit="%" colorClass={Number(errorRate) > 0 ? "text-red-400" : "text-slate-400"} />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                    <h3 className="text-sm font-bold text-amber-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                        Finagle Resilience Layer
                    </h3>
                     <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-sm text-slate-400 font-semibold">Circuit Breaker</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-bold border bg-opacity-10 ${cbColor.replace('text', 'bg')} ${cbColor.replace('text', 'border')} ${cbColor}`}>
                                {circuitBreaker.state}
                            </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                             <div className="bg-slate-800/50 p-2 rounded text-center">
                                <div className="text-xl font-bold text-white">{rateLimiter.remaining ?? 'N/A'}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Tokens Avail</div>
                             </div>
                             <div className="bg-slate-800/50 p-2 rounded text-center">
                                <div className="text-xl font-bold text-white">{circuitBreaker.failures}</div>
                                <div className="text-[10px] text-slate-500 uppercase">Failures</div>
                             </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="text-sm font-bold text-purple-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                        Cache Layer
                    </h3>
                    <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50 flex flex-col justify-between h-full">
                        <div className="flex justify-between items-end mb-4">
                             <div>
                                <div className="text-3xl font-bold text-white">{cache.size ?? 0}</div>
                                <div className="text-[10px] text-slate-500 uppercase font-semibold">Cached Items</div>
                             </div>
                             <SparklesIcon className="w-8 h-8 text-purple-500/20" />
                        </div>
                        <button
                            onClick={onClearCache}
                            className="w-full text-xs font-bold py-2 px-4 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-all uppercase tracking-wider"
                        >
                            Purge Cache
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
});
