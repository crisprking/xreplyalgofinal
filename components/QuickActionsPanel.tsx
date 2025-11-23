import React, { useState } from 'react';
import { type ReplyStrategy } from '../types';

interface QuickActionsPanelProps {
    strategies: ReplyStrategy[];
    onCopyAll: () => void;
    onExport: () => void;
    onSaveFavorite: (strategy: ReplyStrategy) => void;
    onCompare: () => void;
}

export function QuickActionsPanel({ strategies, onCopyAll, onExport, onSaveFavorite, onCompare }: QuickActionsPanelProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [notification, setNotification] = useState<string | null>(null);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 2000);
    };

    const actions = [
        {
            icon: '📋',
            label: 'Copy Best',
            shortcut: 'C',
            action: () => {
                if (strategies.length > 0) {
                    const best = strategies[0];
                    navigator.clipboard.writeText(best.replyText);
                    showNotification('Copied best reply!');
                }
            },
        },
        {
            icon: '📦',
            label: 'Copy All',
            shortcut: 'A',
            action: () => {
                onCopyAll();
                showNotification('Copied all replies!');
            },
        },
        {
            icon: '💾',
            label: 'Export',
            shortcut: 'E',
            action: () => {
                onExport();
                showNotification('Exported to clipboard!');
            },
        },
        {
            icon: '⭐',
            label: 'Save Best',
            shortcut: 'S',
            action: () => {
                if (strategies.length > 0) {
                    onSaveFavorite(strategies[0]);
                    showNotification('Saved to favorites!');
                }
            },
        },
        {
            icon: '⚖️',
            label: 'Compare',
            shortcut: 'M',
            action: () => {
                onCompare();
                showNotification('Comparison mode activated!');
            },
        },
    ];

    return (
        <>
            {/* Floating Action Button */}
            <div className="fixed bottom-6 left-6 z-40">
                <div className={`transition-all duration-300 ${isExpanded ? 'mb-4 space-y-3' : ''}`}>
                    {isExpanded && actions.map((action, idx) => (
                        <button
                            key={idx}
                            onClick={action.action}
                            className="group flex items-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full pl-4 pr-6 py-3 text-white transition-all shadow-lg hover:shadow-xl animate-in slide-in-from-bottom-2"
                            style={{ animationDelay: `${idx * 50}ms` }}
                            title={`${action.label} (Press ${action.shortcut})`}
                        >
                            <span className="text-2xl">{action.icon}</span>
                            <div className="text-left">
                                <div className="font-semibold text-sm">{action.label}</div>
                                <div className="text-xs text-slate-400">Press {action.shortcut}</div>
                            </div>
                        </button>
                    ))}
                </div>

                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-full flex items-center justify-center text-white font-bold transition-all shadow-xl hover:shadow-2xl hover:scale-110"
                >
                    <span className="text-2xl">{isExpanded ? '✕' : '⚡'}</span>
                </button>
            </div>

            {/* Notification Toast */}
            {notification && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-top-4 fade-in">
                    <div className="bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-2">
                        <span className="text-xl">✓</span>
                        <span className="font-semibold">{notification}</span>
                    </div>
                </div>
            )}
        </>
    );
}
