import React, { useEffect, useState } from 'react';

interface ShortcutHandler {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
    category: string;
}

interface KeyboardShortcutsProps {
    handlers: ShortcutHandler[];
}

export function KeyboardShortcuts({ handlers }: KeyboardShortcutsProps) {
    const [showHelp, setShowHelp] = useState(false);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Toggle help with ? or Ctrl+/
            if (event.key === '?' || (event.ctrlKey && event.key === '/')) {
                event.preventDefault();
                setShowHelp(prev => !prev);
                return;
            }

            // Check all handlers
            for (const handler of handlers) {
                const ctrlMatch = handler.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
                const shiftMatch = handler.shift ? event.shiftKey : !event.shiftKey;
                const altMatch = handler.alt ? event.altKey : !event.altKey;
                const keyMatch = event.key.toLowerCase() === handler.key.toLowerCase();

                if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                    event.preventDefault();
                    handler.action();
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handlers]);

    if (!showHelp) {
        return (
            <button
                onClick={() => setShowHelp(true)}
                className="fixed bottom-6 right-6 w-12 h-12 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full flex items-center justify-center text-white font-bold transition-all shadow-lg hover:shadow-xl z-50"
                title="Keyboard Shortcuts (Press ?)"
            >
                <span className="text-lg">?</span>
            </button>
        );
    }

    // Group handlers by category
    const grouped = handlers.reduce((acc, handler) => {
        if (!acc[handler.category]) acc[handler.category] = [];
        acc[handler.category].push(handler);
        return acc;
    }, {} as Record<string, ShortcutHandler[]>);

    const formatKey = (handler: ShortcutHandler) => {
        const parts: string[] = [];
        if (handler.ctrl) parts.push('⌘');
        if (handler.shift) parts.push('⇧');
        if (handler.alt) parts.push('⌥');
        parts.push(handler.key.toUpperCase());
        return parts.join(' + ');
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
            <div className="glass-card rounded-2xl p-8 max-w-2xl w-full max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <span>⌨️</span> Keyboard Shortcuts
                    </h2>
                    <button
                        onClick={() => setShowHelp(false)}
                        className="text-slate-400 hover:text-white transition-colors"
                    >
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="space-y-6">
                    {Object.entries(grouped).map(([category, categoryHandlers]) => (
                        <div key={category}>
                            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">{category}</h3>
                            <div className="space-y-2">
                                {categoryHandlers.map((handler, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
                                    >
                                        <span className="text-slate-300">{handler.description}</span>
                                        <kbd className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-lg text-sm font-mono text-slate-300">
                                            {formatKey(handler)}
                                        </kbd>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-6 pt-6 border-t border-slate-700 text-center text-sm text-slate-400">
                    Press <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">?</kbd> or <kbd className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-mono">⌘ /</kbd> to toggle this menu
                </div>
            </div>
        </div>
    );
}

// Hook for easy setup
export function useKeyboardShortcuts(shortcuts: Omit<ShortcutHandler, 'category'>[], category: string = 'General') {
    return shortcuts.map(s => ({ ...s, category }));
}
