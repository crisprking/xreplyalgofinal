
import React from 'react';

interface ErrorDisplayProps {
  message: string;
  onRetry?: () => void;
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  const safeMessage = message || "An unexpected error occurred.";
  const parts = safeMessage.split(/:(.*)/s);
  const title = parts.length > 1 ? parts[0] : 'Analysis Failed';
  const description = parts.length > 1 ? parts[1].trim() : safeMessage;

  return (
    <div className="max-w-3xl mx-auto my-8 p-6 bg-red-900/30 border border-red-500/50 rounded-2xl shadow-lg">
      <div className="flex items-start gap-4">
        <div className="text-red-400 flex-shrink-0 mt-1">
           <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-red-300">{title}</h3>
          <p className="text-red-400/90 mt-1">{description}</p>
          {onRetry && (
            <button
                onClick={onRetry}
                className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-blue-500"
            >
                Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
