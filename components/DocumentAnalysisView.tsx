import React, { useState, useCallback } from 'react';
import { type DocumentAnalysis } from '../types';
import { Loader } from './Loader';
import { ErrorDisplay } from './ErrorDisplay';
import { DocumentIcon, SparklesIcon } from './icons/Icons';

interface DocumentAnalysisViewProps {
    onAnalyze: (documentText: string) => void;
    isLoading: boolean;
    analysis: DocumentAnalysis | null;
    error: string | null;
    onRetry?: () => void;
}

const exampleDocument = `Project Instructions: Adaptyv Nipah Virus Protein Design Competition
This document outlines the instructions for a project focused on participating in the Adaptyv-sponsored protein design competition to develop a protein capable of neutralizing the Nipah virus. The goal is to submit one or more computationally designed proteins for experimental validation.
I. Project Objective
The primary objective of this project is to design and submit a novel protein that binds to the Nipah virus Glycoprotein G (PDB: 8XPY) with high affinity, thereby inhibiting its ability to infect human cells. The project will leverage computational protein design tools and AI models to generate promising candidates. A secondary objective is to have at least one of our submitted designs selected for experimental validation by Adaptyv.
II. Key Project Milestones and Timeline
Project Kick-off and Team Formation: Week of October 20, 2025
Research and Strategy Finalization: By October 27, 2025
Design Sprints and Computational Modeling: October 27 - November 17, 2025
Candidate Selection and Finalization: November 18 - November 21, 2025
Submission Package Preparation: November 22 - November 23, 2025
Submission Deadline: November 24, 2025
Experimental Validation Period (by Adaptyv): December 1, 2025 - January 6, 2026
Results Analysis and Project Debrief: January 2026
III. Models and Computational Approaches
The project will explore a variety of computational protein design methods. The specific models and approaches to be utilized will be determined during the research phase but are expected to include a combination of:
De Novo Design: Designing a protein from scratch. This could involve using models like RFdiffusion or other generative models.
Lead Optimization: Improving upon existing protein scaffolds or known binders.
AI-powered platforms: Exploration of platforms such as Cradle, which has shown success in previous Adaptyv competitions[1][2].
Structure Prediction and Validation: Tools like AlphaFold2 will be used to predict the structure of our designs and to calculate metrics such as ipSAE (interface Predicted Aligned Error), which is a key selection criterion[3].
A curated list of popular AI models and design methods can be found at the link provided in the competition announcement.
IV. Specific Knowledge and Resources
This project will require knowledge in the areas of protein engineering, computational biology, and machine learning. Key resources for this project include:
Nipah Virus Glycoprotein G (PDB: 8XPY): The target protein structure. All designs must be created to bind to this target.
Proteinbase Competition Page: This is the central hub for all competition details, including submission guidelines and updates[3].
Adaptyv Bio's Platform: While direct use of their platform for this competition is for submission and results, understanding their past competitions and methodologies will be beneficial[4][5].
Relevant Scientific Literature: Research on Nipah virus, its entry mechanism, and existing attempts at inhibitor design will be crucial[6].
V. Submission Instructions
All protein designs must be submitted through the Proteinbase competition page. The submission period is from Monday, October 27, 2025, to November 24, 2025.
Each submission should include:
The amino acid sequence of the designed protein.
A PDB file of the predicted structure of the protein in complex with the Nipah virus Glycoprotein G.
Any additional data or methodology description as required by the submission portal.
A total of 1,000 designs will be selected for synthesis and testing based on three criteria: 600 by ipSAE score, 200 by an expert panel, and 200 by community vote. Therefore, designs should be optimized for a low ipSAE score.
VI. Style and Formatting of Deliverables
All internal documentation, including research notes, model outputs, and design rationales, will be maintained in a shared project repository. The final submission will adhere strictly to the format specified on the Proteinbase platform. The project will culminate in a final report summarizing the design process, the results (if our designs are selected), and key learnings.
Sources
help
adaptyvbio.com
cradle.bio
proteinbase.com
adaptyvbio.com
biorxiv.org
nih.gov
`;

function AnalysisSection({ title, children, color = 'cyan' }: { title: string; children?: React.ReactNode, color?: string }) {
    const colorClasses = {
        cyan: 'text-cyan-400',
        purple: 'text-purple-400',
        green: 'text-green-400',
        amber: 'text-amber-400',
    }[color] || 'text-cyan-400';
    
    return (
        <div className="glass-card rounded-2xl p-6">
            <h3 className={`text-lg font-bold ${colorClasses} mb-3 uppercase tracking-wider`}>{title}</h3>
            <div className="text-slate-300 space-y-3">{children}</div>
        </div>
    );
}

export const DocumentAnalysisView = React.memo(function DocumentAnalysisView({ onAnalyze, isLoading, analysis, error, onRetry }: DocumentAnalysisViewProps) {
    const [documentText, setDocumentText] = useState('');
    
    const handleLoadExample = useCallback(() => {
        setDocumentText(exampleDocument);
    }, []);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (documentText.trim() && !isLoading) {
            onAnalyze(documentText);
        }
    };

    return (
        <div className="space-y-8">
            <div className="max-w-4xl mx-auto">
                <form onSubmit={handleSubmit} className="p-6 md:p-8 glass-card rounded-2xl shadow-2xl shadow-slate-950/50">
                    <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="documentText" className="block text-sm font-medium text-slate-400">
                                Document Content
                            </label>
                            <button
                                type="button"
                                onClick={handleLoadExample}
                                aria-label="Load an example document"
                                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                            >
                                Load Example
                            </button>
                        </div>
                        <textarea
                            id="documentText"
                            value={documentText}
                            onChange={(e) => setDocumentText(e.target.value)}
                            rows={10}
                            placeholder="Paste a document, article, or any text to analyze..."
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-shadow duration-200"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || !documentText.trim()}
                        className="w-full flex items-center justify-center gap-3 text-white font-bold py-3 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all duration-200 transform hover:scale-105 disabled:scale-100 group"
                    >
                        <DocumentIcon className="w-5 h-5 transition-transform group-hover:rotate-[-3deg]" />
                        {isLoading ? 'Analyzing Document...' : 'Run Deep Analysis'}
                    </button>
                </form>
            </div>

            {isLoading && <Loader />}
            {error && <ErrorDisplay message={error} onRetry={onRetry} />}

            {analysis && (
                <div className="space-y-6">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-white">{analysis.title}</h2>
                    </div>
                    
                    <AnalysisSection title="Executive Summary">
                        <p className="text-base leading-relaxed">{analysis.summary}</p>
                    </AnalysisSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnalysisSection title="Primary Objectives" color="green">
                            <ul className="list-disc list-inside space-y-2">
                                {analysis.objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                            </ul>
                        </AnalysisSection>

                        <AnalysisSection title="Submission Requirements" color="amber">
                            <ul className="list-disc list-inside space-y-2">
                                {analysis.submissionRequirements.map((req, i) => <li key={i}>{req}</li>)}
                            </ul>
                        </AnalysisSection>
                    </div>

                    <AnalysisSection title="Key Milestones & Timeline" color="purple">
                        <div className="relative border-l-2 border-slate-700 pl-6 space-y-6">
                            {analysis.milestones.map((milestone, i) => (
                                <div key={i} className="relative">
                                    <div className="absolute -left-[34px] top-1 w-4 h-4 bg-purple-500 rounded-full border-4 border-slate-800"></div>
                                    <p className="font-bold text-purple-300">{milestone.date}</p>
                                    <p className="font-semibold text-white">{milestone.event}</p>
                                    {milestone.details && <p className="text-sm text-slate-400">{milestone.details}</p>}
                                </div>
                            ))}
                        </div>
                    </AnalysisSection>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <AnalysisSection title="Models & Approaches">
                            <div className="flex flex-wrap gap-2">
                                {analysis.modelsAndApproaches.map((model, i) => (
                                    <span key={i} className="px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-sm font-medium">
                                        {model}
                                    </span>
                                ))}
                            </div>
                        </AnalysisSection>

                        <AnalysisSection title="Key Resources">
                            <ul className="list-disc list-inside space-y-2">
                                {analysis.keyResources.map((res, i) => (
                                    <li key={i}>
                                        {res.name}
                                        {res.link && <a href={`https://${res.link}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline ml-2 text-xs">[{res.link}]</a>}
                                    </li>
                                ))}
                            </ul>
                        </AnalysisSection>
                    </div>
                </div>
            )}
            
            {!isLoading && !error && !analysis && (
                <div className="text-center py-20 px-6 rounded-2xl glass-card">
                    <div className="flex justify-center items-center mb-4">
                        <SparklesIcon className="w-12 h-12 text-cyan-500" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Unlock Deeper Insights</h2>
                    <p className="text-slate-400 max-w-2xl mx-auto">
                        Paste any document—meeting notes, project briefs, articles—to extract structured data and key takeaways instantly.
                    </p>
                </div>
            )}

        </div>
    );
});
