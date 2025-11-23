
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { PostInput } from './components/PostInput';
import { AnalysisDisplay } from './components/AnalysisDisplay';
import { AutomationDashboard } from './components/AutomationDashboard';
import { SystemMetrics } from './components/SystemMetrics';
import { Loader } from './components/Loader';
import { ErrorDisplay } from './components/ErrorDisplay';
import { generateReplies, getSystemMetrics, clearCache, analyzeDocument } from './services/geminiService';
import { createXAutomationService, DEFAULT_AUTOMATION_CONFIG, DEFAULT_SEARCH_CRITERIA } from './services/x-automation-service';
import { type PostAnalysis, type ReplyStrategy, type XApiCredentials, type AutomationConfig, type PostSearchCriteria, type PostCandidate, type AutomationResult, type DocumentAnalysis } from './types';
import { SparklesIcon, BrainCircuitIcon, RiskIcon, DocumentIcon } from './components/icons/Icons';
import { DocumentAnalysisView } from './components/DocumentAnalysisView';


type ViewMode = 'x-post' | 'document' | 'automation' | 'metrics';

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
    
    // Automation state
    const [viewMode, setViewMode] = useState<ViewMode>('x-post');
    const [automationService, setAutomationService] = useState<any>(null);
    const [automationConfig, setAutomationConfig] = useState<AutomationConfig>(DEFAULT_AUTOMATION_CONFIG);
    const [searchCriteria, setSearchCriteria] = useState<PostSearchCriteria>(DEFAULT_SEARCH_CRITERIA);
    const [credentials, setCredentials] = useState<XApiCredentials | null>(null);
    const [automationStatus, setAutomationStatus] = useState<any>(null);
    const [candidatePosts, setCandidatePosts] = useState<PostCandidate[]>([]);
    const [automationResults, setAutomationResults] = useState<AutomationResult[]>([]);
    const [isAutomationRunning, setIsAutomationRunning] = useState(false);

    // System metrics state
    const [systemMetrics, setSystemMetrics] = useState<any>(null);

    // Initialize automation service when credentials are provided
    useEffect(() => {
        if (credentials && credentials.bearerToken) {
            try {
                const service = createXAutomationService(credentials, automationConfig);
                setAutomationService(service);
                setAutomationStatus(service.getStatus());
            } catch (err) {
                setError(`Failed to initialize automation: ${err instanceof Error ? err.message : 'Unknown error'}`);
            }
        }
    }, [credentials, automationConfig]);

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

    const handleCredentialChange = useCallback((field: keyof XApiCredentials, value: string) => {
        setCredentials(prev => ({
            ...(prev || { bearerToken: '', appKey: '', appSecret: '', accessToken: '', accessSecret: '' }),
            [field]: value
        }));
    }, []);

    // Automation handlers
    const handleFindCandidates = useCallback(async () => {
        if (!automationService) {
            setError('Automation service not initialized. Please configure your Twitter Bearer Token first.');
            return;
        }

        setIsAutomationRunning(true);
        setError(null);

        try {
            const candidates = await automationService.findCandidatePosts(searchCriteria);
            setCandidatePosts(candidates);
            console.log(`Found ${candidates.length} candidate posts`);
        } catch (err) {
            setError(`Failed to find candidates: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsAutomationRunning(false);
        }
    }, [automationService, searchCriteria]);

    const handleRunAutomation = useCallback(async () => {
        if (!automationService) {
            setError('Automation service not initialized. Please configure your Twitter Bearer Token first.');
            return;
        }

        setIsAutomationRunning(true);
        setError(null);
        setAutomationResults([]);

        try {
            const results = await automationService.runAutomation(searchCriteria);
            setAutomationResults(prev => [...results, ...prev].slice(0, 50)); // Keep last 50 results
            setAutomationStatus(automationService.getStatus());
        } catch (err) {
            setError(`Automation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
            setIsAutomationRunning(false);
        }
    }, [automationService, searchCriteria]);

    const handleUpdateConfig = useCallback((newConfig: Partial<AutomationConfig>) => {
        const updatedConfig = { ...automationConfig, ...newConfig };
        setAutomationConfig(updatedConfig);
        
        if (automationService) {
            automationService.updateConfig(newConfig);
            setAutomationStatus(automationService.getStatus());
        }
    }, [automationConfig, automationService]);

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
                <div className="glass-card rounded-xl p-1 sm:p-2 flex gap-1 sm:gap-2">
                    <button
                        onClick={() => setViewMode('x-post')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                            viewMode === 'x-post'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <BrainCircuitIcon className="w-4 h-4" />
                        X Post Analysis
                    </button>
                     <button
                        onClick={() => setViewMode('document')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                            viewMode === 'document'
                                ? 'bg-cyan-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <DocumentIcon className="w-4 h-4" />
                        Document Analysis
                    </button>
                    <button
                        onClick={() => setViewMode('automation')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                            viewMode === 'automation'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <RiskIcon className="w-4 h-4" />
                        Automation
                    </button>
                    <button
                        onClick={() => setViewMode('metrics')}
                        className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all text-sm sm:text-base ${
                            viewMode === 'metrics'
                                ? 'bg-green-600 text-white shadow-lg'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                    >
                        <SparklesIcon className="w-4 h-4" />
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
                            <h2 className="text-2xl font-bold text-white mb-2">Ready to Dominate?</h2>
                            <p className="text-slate-400 max-w-2xl mx-auto">
                                Use the 'X Post Analysis' for replies, 'Document Analysis' for deep dives, or 'Automation' to put engagement on autopilot.
                            </p>
                        </div>
                    )}
                </>
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

            {/* Automation View */}
            {viewMode === 'automation' && (
                <AutomationDashboard
                    credentials={credentials}
                    onCredentialsChange={handleCredentialChange}
                    config={automationConfig}
                    onConfigChange={handleUpdateConfig}
                    searchCriteria={searchCriteria}
                    onSearchCriteriaChange={setSearchCriteria}
                    automationStatus={automationStatus}
                    candidatePosts={candidatePosts}
                    automationResults={automationResults}
                    isRunning={isAutomationRunning}
                    onFindCandidates={handleFindCandidates}
                    onRunAutomation={handleRunAutomation}
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
                <p>APEX X ULTIMATE SYSTEM v7.0 © 2025. All Rights Reserved.</p>
                <p>Engineered for elite performance with automated high-engagement targeting.</p>
            </footer>
        </div>
    );
}