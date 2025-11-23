



import React, { useState, useEffect } from 'react';
import { BrainCircuitIcon } from './icons/Icons';

interface PostInputProps {
    onAnalyze: (postText: string, authorHandle: string) => void;
    isLoading: boolean;
    onLoadExample: () => void;
    exampleData: {post: string, author: string} | null;
}

export function PostInput({ onAnalyze, isLoading, onLoadExample, exampleData }: PostInputProps) {
    const [postText, setPostText] = useState('');
    const [authorHandle, setAuthorHandle] = useState('');

    useEffect(() => {
        if (exampleData) {
            setPostText(exampleData.post);
            setAuthorHandle(exampleData.author);
        }
    }, [exampleData]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (postText.trim() && !isLoading) {
            onAnalyze(postText, authorHandle);
        }
    };

    return (
        <div className="max-w-3xl mx-auto mb-8 md:mb-12">
            <form onSubmit={handleSubmit} className="p-6 md:p-8 glass-card rounded-2xl shadow-2xl shadow-slate-950/50">
                <div className="mb-4">
                    <div className="flex justify-between items-center mb-2">
                        <label htmlFor="postText" className="block text-sm font-medium text-slate-400">
                            X Post Content
                        </label>
                        <button
                            type="button"
                            onClick={onLoadExample}
                            aria-label="Load an example X post"
                            className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                        >
                            Load Example
                        </button>
                    </div>
                    <textarea
                        id="postText"
                        value={postText}
                        onChange={(e) => setPostText(e.target.value)}
                        rows={5}
                        placeholder="Paste the X post you want to reply to..."
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200"
                        required
                    />
                </div>
                <div className="mb-6">
                    <label htmlFor="authorHandle" className="block text-sm font-medium text-slate-400 mb-2">
                        Author Handle (Optional)
                    </label>
                    <input
                        id="authorHandle"
                        type="text"
                        value={authorHandle}
                        onChange={(e) => setAuthorHandle(e.target.value)}
                        placeholder="@username"
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow duration-200"
                    />
                </div>
                <button
                    type="submit"
                    disabled={isLoading || !postText.trim()}
                    className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100 group"
                >
                    <BrainCircuitIcon className="w-5 h-5 transition-transform group-hover:rotate-6" />
                    {isLoading ? 'Analyzing...' : 'Analyze & Generate Top Strategy'}
                </button>
            </form>
        </div>
    );
}