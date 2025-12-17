
import React from 'react';
import type { AnalysisResult } from '../types';
import { ScoreDonutChart } from './ScoreDonutChart';
import { CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface ResultsDisplayProps {
  result: AnalysisResult;
  theme: 'light' | 'dark';
}

export const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result, theme }) => {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Score Section */}
      <div className="flex flex-col items-center">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Match Score</h3>
        <ScoreDonutChart score={result.score} theme={theme} />
      </div>

      {/* Overview Section */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-5 rounded-lg border border-blue-100 dark:border-blue-800">
        <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Executive Summary
        </h4>
        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
          {result.overview}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Strengths / Matches */}
        <div className="border border-green-200 dark:border-green-900/30 rounded-xl overflow-hidden">
            <div className="bg-green-50 dark:bg-green-900/20 px-5 py-3 border-b border-green-100 dark:border-green-900/30">
                <h4 className="text-lg font-semibold text-green-800 dark:text-green-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                    Matches & Strengths
                </h4>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800">
                <ul className="space-y-4">
                    {result.strengths.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                        <div className="min-w-6 mt-0.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 text-xs font-bold">
                                {index + 1}
                            </span>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                    ))}
                </ul>
                {result.strengths.length === 0 && (
                    <p className="text-gray-500 italic">No specific strong matches found yet.</p>
                )}
            </div>
        </div>

        {/* Improvements / Missing */}
        <div className="border border-amber-200 dark:border-amber-900/30 rounded-xl overflow-hidden">
             <div className="bg-amber-50 dark:bg-amber-900/20 px-5 py-3 border-b border-amber-100 dark:border-amber-900/30">
                <h4 className="text-lg font-semibold text-amber-800 dark:text-amber-100 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    Missing & Improvements
                </h4>
            </div>
            <div className="p-5 bg-white dark:bg-gray-800">
                 <ul className="space-y-4">
                    {result.improvements.map((item, index) => (
                    <li key={index} className="flex items-start gap-3">
                         <div className="min-w-6 mt-0.5">
                            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400 text-xs font-bold">
                                {index + 1}
                            </span>
                        </div>
                        <span className="text-gray-700 dark:text-gray-300">{item}</span>
                    </li>
                    ))}
                </ul>
                {result.improvements.length === 0 && (
                    <p className="text-gray-500 italic">Great job! No major improvements detected.</p>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
