
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PostInput } from './components/PostInput';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { AutomationDashboard } from './components/AutomationDashboard';
import { SystemMetrics } from './components/SystemMetrics';
import { Loader } from './components/Loader';
import { ErrorDisplay } from './components/ErrorDisplay';
import { generateReplies, getSystemMetrics, clearCache, analyzeDocument, generatePostIdeas } from './services/geminiService';
import { type PostAnalysis, type ReplyStrategy, type DocumentAnalysis, type PostCompanionAnalysis } from './types';
import { SparklesIcon, BrainCircuitIcon, DocumentIcon, RiskIcon } from './components/icons/Icons';
import { DocumentAnalysisView } from './components/DocumentAnalysisView';
import { PostCompanionView } from './components/PostCompanionView';


type ViewMode = 'x-post' | 'post-companion' | 'document' | 'metrics';

export default function App() {
    // X Post analysis state
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<PostAnalysis | null>(null);
    const [strategies, setStrategies] = useState<ReplyStrategy[]>([]);
    const [exampleData, setExampleData] = useState<{post: string, author: string} | null>(null);
    const [lastRequest, setLastRequest] = useState<{postText: string, authorHandle: string} | null>(null);

    // Document analysis state
    const [isDocumentLoading, setIsDocumentLoading] = useState(false);
    const [documentError, setDocumentError] = useState<string | null>(null);
    const [documentAnalysis, setDocumentAnalysis] = useState<DocumentAnalysis | null>(null);
    const [lastDocumentRequest, setLastDocumentRequest] = useState<string | null>(null);

    // Post Companion state
    const [isCompanionLoading, setIsCompanionLoading] = useState(false);
    const [companionError, setCompanionError] = useState<string | null>(null);
    const [companionAnalysis, setCompanionAnalysis] = useState<PostCompanionAnalysis | null>(null);

    // View state
    const [viewMode, setViewMode] = useState<ViewMode>('x-post');

    // System metrics state
    const [systemMetrics, setSystemMetrics] = useState<any>(null);

    // Update system metrics periodically
    useEffect(() => {
        const updateMetrics = () => {
            try {
                const metrics = getSystemMetrics();
                setSystemMetrics(metrics);
            } catch (err) {
                console.error('Failed to get system metrics:', err);
            }
        };

        updateMetrics();
        const interval = setInterval(updateMetrics, 30000); // Update every 30 seconds

        return () => clearInterval(interval);
    }, []);

    // X Post analysis handler
    const handleAnalyze = useCallback(async (postText: string, authorHandle: string) => {
        setIsLoading(true);
        setError(null);
        setAnalysis(null);
        setStrategies([]);
        setLastRequest({ postText, authorHandle });

        try {
            const result = await generateReplies(postText, authorHandle, {
                useCache: true,
                temperature: 0.3
            });
            
            setAnalysis(result.analysis);
            
            const validStrategies = (result.strategies || []).filter(s => 
                s && s.scores && typeof s.scores.algorithmScore === 'number'
            );
            setStrategies(validStrategies.sort((a, b) => b.scores.algorithmScore - a.scores.algorithmScore));

        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('An unknown error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleAnalyzeDocument = useCallback(async (documentText: string) => {
        setIsDocumentLoading(true);
        setDocumentError(null);
        setDocumentAnalysis(null);
        setLastDocumentRequest(documentText);
        try {
            const result = await analyzeDocument(documentText);
            setDocumentAnalysis(result);
        } catch (err) {
            if (err instanceof Error) {
                setDocumentError(err.message);
            } else {
                setDocumentError('An unknown error occurred during document analysis.');
            }
        } finally {
            setIsDocumentLoading(false);
        }
    }, []);


    // Load example data
    const handleLoadExample = useCallback(() => {
        const examples = [
            {
                post: `The biggest misconception about AI startups is that you need massive datasets to compete. Some of the most successful AI companies started with <1000 carefully curated examples. Quality >> Quantity.`,
                author: `@sama`
            },
            {
                post: `Just shipped our Q3 results. Revenue up 340% YoY. The problem isn't growth anymore—it's keeping up with demand while maintaining quality. Good problems to have.`,
                author: `@elonmusk`
            },
            {
                post: `SF is starting to feel institutionalized in a very bad way, like the Penn frat -> IB pipeline game but for a new type of finance bro. Alpha lies not this way`,
                author: `@isaiah_p_taylor`
            }
        ];
        
        const randomExample = examples[Math.floor(Math.random() * examples.length)];
        setExampleData(randomExample);
    }, []);

    const handleRetry = useCallback(() => {
        if (lastRequest) {
            handleAnalyze(lastRequest.postText, lastRequest.authorHandle);
        }
    }, [lastRequest, handleAnalyze]);

    const handleDocumentRetry = useCallback(() => {
        if (lastDocumentRequest) {
            handleAnalyzeDocument(lastDocumentRequest);
        }
    }, [lastDocumentRequest, handleAnalyzeDocument]);

    // Post Companion handler
    const handleGeneratePostIdeas = useCallback(async (context?: { niche?: string; goals?: string; recentPosts?: string[] }) => {
        setIsCompanionLoading(true);
        setCompanionError(null);
        setCompanionAnalysis(null);

        try {
            const result = await generatePostIdeas(context);
            setCompanionAnalysis(result);
        } catch (err) {
            if (err instanceof Error) {
                setCompanionError(err.message);
            } else {
                setCompanionError('An unknown error occurred during post idea generation.');
            }
        } finally {
            setIsCompanionLoading(false);
        }
    }, []);

    const handleClearCache = useCallback(() => {
        clearCache();
        alert('System cache cleared successfully!');
    }, []);
    
    const isRetryableError = error?.includes('Service Unavailable') || error?.includes('Network Error') || error?.includes('high traffic') || error?.includes('Model Overloaded');
    const isDocumentRetryableError = documentError?.includes('Service Unavailable') || documentError?.includes('Network Error') || documentError?.includes('high traffic') || documentError?.includes('Model Overloaded');

    return (
        <div className="min-h-screen">
          <div className="fixed inset-0 -z-10 bg-slate-950 bg-pattern"></div>
          
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
            <Header />

            {/* Navigation */}
            <div className="mb-8 flex justify-center">
                <div className="glass-card rounded-xl p-1 sm:p-2 flex gap-1 sm:gap-2 overflow-x-auto">
                    <button
                        onClick={() => setViewMode('x-post')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                            viewMode === 'x-post'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <BrainCircuitIcon className="w-4 h-4" />
                        Reply Analyzer
                    </button>
                    <button
                        onClick={() => setViewMode('post-companion')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                            viewMode === 'post-companion'
                                ? 'bg-cyan-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <SparklesIcon className="w-4 h-4" />
                        Post Companion
                    </button>
                    <button
                        onClick={() => setViewMode('document')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                            viewMode === 'document'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <DocumentIcon className="w-4 h-4" />
                        Document Analysis
                    </button>
                    <button
                        onClick={() => setViewMode('metrics')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base whitespace-nowrap ${
                            viewMode === 'metrics'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <RiskIcon className="w-4 h-4" />
                        System Health
                    </button>
                </div>
            </div>

            {/* Error Display */}
            {error && <ErrorDisplay message={error} onRetry={isRetryableError && lastRequest ? handleRetry : undefined} />}

            {/* X Post Analysis View */}
            {viewMode === 'x-post' && (
                <>
                    <PostInput
                        onAnalyze={handleAnalyze}
                        isLoading={isLoading}
                        onLoadExample={handleLoadExample}
                        exampleData={exampleData}
                    />

                    {isLoading && <Loader />}

                    {analysis && strategies.length > 0 && (
                        <AnalysisDisplay analysis={analysis} strategies={strategies} />
                    )}

                    {!isLoading && !error && !analysis && (
                        <div className="text-center py-20 px-6 rounded-2xl glass-card">
                            <div className="flex justify-center items-center mb-4">
                                <SparklesIcon className="w-12 h-12 text-blue-500" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">APEX X ULTIMATE SYSTEM v8.0</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto">
                                Analyze X posts for optimal replies, generate trending post ideas, or analyze documents — all powered by Twitter's open-source algorithm insights.
                            </p>
                        </div>
                    )}
                </>
            )}

            {/* Post Companion View */}
            {viewMode === 'post-companion' && (
                <PostCompanionView
                    onGenerate={handleGeneratePostIdeas}
                    isLoading={isCompanionLoading}
                    analysis={companionAnalysis}
                    error={companionError}
                />
            )}

            {/* Document Analysis View */}
            {viewMode === 'document' && (
                <DocumentAnalysisView
                    onAnalyze={handleAnalyzeDocument}
                    isLoading={isDocumentLoading}
                    analysis={documentAnalysis}
                    error={documentError}
                    onRetry={isDocumentRetryableError ? handleDocumentRetry : undefined}
                />
            )}

            {/* System Metrics View */}
            {viewMode === 'metrics' && (
                <SystemMetrics
                    metrics={systemMetrics}
                    onClearCache={handleClearCache}
                />
            )}
            </main>
            <footer className="text-center py-6 text-sm text-slate-500">
                <p>APEX X ULTIMATE SYSTEM v8.0 © 2025. All Rights Reserved.</p>
                <p>Engineered for elite performance with Twitter algorithm integration.</p>
            </footer>
        </div>
    );
}