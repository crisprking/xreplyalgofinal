import React, { useState, useEffect } from 'react';
import { ApexLogo } from './icons/Icons';

export function Loader() {
    const loadingMessages = [
        "Phase 1/9: Executing deep psychological deconstruction...",
        "Phase 2/9: Generating 25 mass candidate strategies...",
        "Phase 3/9: Running evolutionary optimization tournament...",
        "Phase 4/9: Performing surgical character count optimization...",
        "Phase 5/9: Calculating multi-dimensional scoring matrix...",
        "Phase 6/9: Applying v7.0 algorithmic score formula...",
        "Phase 7/9: Assessing risk profiles and mitigation paths...",
        "Phase 8/9: Modeling best, worst, and most-likely outcomes...",
        "Phase 9/9: Finalizing validation and ranking..."
    ];
    const [messageIndex, setMessageIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex(prevIndex => (prevIndex + 1) % loadingMessages.length);
        }, 2500);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="text-center py-16">
            <div className="flex justify-center items-center mb-6">
                <ApexLogo className="w-16 h-16 text-blue-500 animate-pulse" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Executing APEX v7.0 Protocol...</h2>
            <p className="text-slate-400 transition-opacity duration-500">
                {loadingMessages[messageIndex]}
            </p>
        </div>
    );
}