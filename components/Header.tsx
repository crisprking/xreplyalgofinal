import React from 'react';
import { ApexLogo } from './icons/Icons';

export function Header() {
    return (
        <header className="text-center mb-8 md:mb-12">
            <div className="inline-flex items-center gap-3 mb-4">
                <ApexLogo className="w-12 h-12 text-blue-500" />
                <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-slate-200 to-slate-400 bg-clip-text text-transparent">
                    APEX X ULTIMATE
                </h1>
            </div>
            <p className="text-lg text-slate-400 max-w-3xl mx-auto">
                An elite, AI-powered system to generate strategically optimized replies for X, engineered for high-stakes engagement.
            </p>
        </header>
    );
}