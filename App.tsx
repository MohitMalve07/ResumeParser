
import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { FileInput } from './components/FileInput';
import { JobDescriptionInput } from './components/JobDescriptionInput';
import { ResultsDisplay } from './components/ResultsDisplay';
import { Loader } from './components/Loader';
import { analyzeResume } from './services/geminiService';
import type { AnalysisHistoryItem, AnalysisResult } from './types';
import { Bot, FileText, AlertTriangle, Download, FileDown, ChevronDown, Building2 } from 'lucide-react';
import { HistoryPanel } from './components/HistoryPanel';

declare const jspdf: any;

type Theme = 'light' | 'dark';

interface AppError {
  title: string;
  message: string;
  details?: string;
}

const App: React.FC = () => {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [selectedHistoryItem, setSelectedHistoryItem] = useState<AnalysisHistoryItem | null>(null);
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<AppError | null>(null);
  const [resumeText, setResumeText] = useState<string>('');
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme | null;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);
  
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  // Load history from localStorage on initial mount with migration logic
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem('resumeAnalysisHistory');
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        
        // Adapt old format to new format if necessary
        const adaptedHistory = parsed.map((item: any) => {
            // Check if it's the old format where strengths was a string
            if (typeof item.result.strengths === 'string') {
                return {
                    ...item,
                    result: {
                        score: item.result.score,
                        // Use old strengths string as the overview
                        overview: item.result.strengths, 
                        // Use old keywords array as strengths list (if available), or empty
                        strengths: Array.isArray(item.result.keywords) ? item.result.keywords : [], 
                        improvements: Array.isArray(item.result.improvements) ? item.result.improvements : []
                    } as AnalysisResult
                };
            }
            // Ensure schema compliance for new items
            if (!item.result.overview && typeof item.result.strengths !== 'string') {
                 // Fallback for missing overview in very recent but non-compliant items
                 return {
                    ...item,
                    result: {
                        ...item.result,
                        overview: "Overview not available for this analysis.",
                    }
                 };
            }
            return item;
        });

        setAnalysisHistory(adaptedHistory);
      }
    } catch (e) {
      console.error("Failed to parse history from localStorage", e);
      setAnalysisHistory([]);
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('resumeAnalysisHistory', JSON.stringify(analysisHistory));
    } catch (e) {
      console.error("Failed to save history to localStorage", e);
    }
  }, [analysisHistory]);

  const handleFileParsed = useCallback((data: { file: File; text: string; } | null, errorMsg?: string) => {
    setSelectedHistoryItem(null); // Clear results on new file
    if (errorMsg) {
      setError({ title: 'File Parsing Error', message: errorMsg });
      setResumeFile(null);
      setResumeText('');
      return;
    }

    if (data) {
      setError(null);
      setResumeFile(data.file);
      setResumeText(data.text);
    } else { // This happens when file is removed
      setError(null);
      setResumeFile(null);
      setResumeText('');
    }
  }, []);

  const handleAnalyzeClick = async () => {
    if (!resumeText || !jobDescription || !resumeFile) {
      setError({ title: 'Missing Information', message: 'Please provide both a resume and a job description.' });
      return;
    }

    setIsLoading(true);
    setError(null);
    setSelectedHistoryItem(null);

    try {
      const result = await analyzeResume(resumeText, jobDescription);
      
      const newHistoryItem: AnalysisHistoryItem = {
        id: Date.now().toString(),
        fileName: resumeFile.name,
        companyName: companyName,
        date: new Date().toLocaleDateString(),
        result,
      };

      const updatedHistory = [newHistoryItem, ...analysisHistory];
      setAnalysisHistory(updatedHistory);
      setSelectedHistoryItem(newHistoryItem);

    } catch (err: any) {
      console.error("Full analysis error:", err);
      
      let title = "Analysis Failed";
      let message = "An unexpected error occurred during the analysis. Please try again.";
      let details = "";

      if (err instanceof Error) {
        message = err.message;
        details = err.stack || "";
        
        // Enhance message based on common error patterns
        if (message.includes('429')) {
          title = "Quota Exceeded";
          message = "You have exceeded the API rate limit. Please wait a moment before trying again.";
        } else if (message.includes('503')) {
          title = "Service Unavailable";
          message = "The AI service is currently unavailable. Please try again later.";
        } else if (message.includes('API_KEY') || message.includes('401')) {
          title = "Authentication Error";
          message = "There seems to be an issue with the API key. Please check your configuration.";
        } else if (message.includes('safety') || message.includes('blocked')) {
            title = "Content Flagged";
            message = "The analysis was stopped due to safety content filters. Please review your resume or job description.";
        } else if (message.includes('JSON')) {
             title = "Parsing Error";
             message = "Received an invalid response format from the AI. This usually resolves on a retry.";
        }
      } else if (typeof err === 'string') {
        message = err;
      } else {
        details = JSON.stringify(err, null, 2);
      }

      setError({ title, message, details });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDownloadPdf = () => {
    if (!resumeText || !resumeFile) return;

    const { jsPDF } = jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');

    const margin = 15;
    const maxWidth = doc.internal.pageSize.getWidth() - margin * 2;
    const pageHeight = doc.internal.pageSize.getHeight();
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);

    const lines = doc.splitTextToSize(resumeText, maxWidth);
    
    let cursorY = margin;
    const lineHeight = 5; // in mm

    lines.forEach((line: string) => {
        if (cursorY > pageHeight - margin) {
            doc.addPage();
            cursorY = margin;
        }
        doc.text(line, margin, cursorY);
        cursorY += lineHeight;
    });

    const safeFileName = resumeFile.name.split('.').slice(0, -1).join('.') || 'resume';
    doc.save(`${safeFileName}_converted.pdf`);
  };

  const handleSelectHistoryItem = (item: AnalysisHistoryItem) => {
    setSelectedHistoryItem(item);
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear all analysis history? This action cannot be undone.')) {
      setAnalysisHistory([]);
      setSelectedHistoryItem(null);
    }
  };
  
  const handleExport = () => {
    if (!selectedHistoryItem) return;

    const { result, fileName, companyName, date } = selectedHistoryItem;
    const { score, overview, strengths, improvements } = result;

    const { jsPDF } = jspdf;
    const doc = new jsPDF();
    
    const margin = 20;
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - (margin * 2);
    let y = 20;

    // Helper for page breaks
    const checkPageBreak = (heightNeeded: number) => {
        if (y + heightNeeded > doc.internal.pageSize.getHeight() - margin) {
            doc.addPage();
            y = margin;
            return true;
        }
        return false;
    };

    // --- Header ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(33, 33, 33);
    doc.text("Resume Analysis Report", pageWidth / 2, y, { align: "center" });
    y += 15;

    // --- Metadata Section ---
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);

    const addMetadataLine = (label: string, value: string) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(value, margin + 45, y);
      y += 7;
    };

    addMetadataLine("Date:", date);
    addMetadataLine("Resume Name:", fileName);
    addMetadataLine("Company / Role:", companyName || "Not specified");
    addMetadataLine("Acceptability Rate:", `${score}%`);
    
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;
    
    // --- Overview ---
    if (overview) {
        checkPageBreak(30);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.text("Executive Summary", margin, y);
        y += 8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(60, 60, 60);
        
        const splitOverview = doc.splitTextToSize(overview, contentWidth);
        if (checkPageBreak(splitOverview.length * 5)) {
             // Just continue
        }
        doc.text(splitOverview, margin, y);
        y += (splitOverview.length * 5) + 12;
    }

    // --- Strengths ---
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(0, 100, 0); // Dark Green for Matches
    doc.text("Matches & Strengths", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);
    
    if (strengths.length > 0) {
        strengths.forEach((item, index) => {
            const bulletText = `+ ${item}`;
            const splitItem = doc.splitTextToSize(bulletText, contentWidth);
            
            if (checkPageBreak(splitItem.length * 5)) {
                // Just continue
            }
            doc.text(splitItem, margin, y);
            y += (splitItem.length * 5) + 3;
        });
    } else {
         doc.text("No specific strong matches found.", margin, y);
         y += 8;
    }
    y += 10;

    // --- Improvements ---
    checkPageBreak(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(180, 80, 0); // Dark Orange/Amber for improvements
    doc.text("Missing & Improvements", margin, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(60, 60, 60);

    if (improvements.length > 0) {
        improvements.forEach((item, index) => {
            const bulletText = `! ${item}`;
            const splitItem = doc.splitTextToSize(bulletText, contentWidth);
            
            if (checkPageBreak(splitItem.length * 5)) {
                // Just continue
            }
            doc.text(splitItem, margin, y);
            y += (splitItem.length * 5) + 3;
        });
    } else {
        doc.text("No major improvements detected.", margin, y);
        y += 8;
    }

    // --- Footer ---
    const pageCount = doc.internal.getNumberOfPages();
    for(let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 150);
        doc.text(`Generated by AI Resume Analyzer - Page ${i} of ${pageCount}`, pageWidth / 2, 285, { align: "center" });
    }

    const safeName = (companyName || "analysis").replace(/[^a-z0-9]/gi, '_').substring(0, 30);
    doc.save(`Report_${safeName}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-sans transition-colors duration-300">
      <Header theme={theme} toggleTheme={toggleTheme} />
      <main className="container mx-auto p-4 md:p-8">
        <div className="max-w-screen-2xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
          
          <div className="xl:col-span-3">
            <HistoryPanel
              history={analysisHistory}
              onSelectItem={handleSelectHistoryItem}
              selectedItem={selectedHistoryItem}
              onClearHistory={handleClearHistory}
            />
          </div>

          <div className="xl:col-span-9 grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg border border-gray-200 dark:border-gray-700 flex flex-col gap-8">
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                <FileText className="text-gray-400 dark:text-gray-500" />
                Your Details
              </h2>
              <div>
                <FileInput onFileParsed={handleFileParsed} />
                {resumeFile && (
                  <button
                    onClick={handleDownloadPdf}
                    className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                    aria-label="Download resume as PDF"
                  >
                    <FileDown size={16} />
                    Download Resume as PDF
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="company-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Company / Job Title <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Building2 className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="company-name"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-800 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-gray-800 dark:focus:ring-gray-300 focus:border-gray-800 dark:focus:border-gray-300 sm:text-sm transition text-gray-900 dark:text-gray-100"
                    placeholder="e.g. Google - Senior Frontend Engineer"
                  />
                </div>
              </div>

              <JobDescriptionInput value={jobDescription} onChange={setJobDescription} />
              
              <button
                onClick={handleAnalyzeClick}
                disabled={isLoading || !resumeFile || !jobDescription}
                className="w-full bg-gray-900 dark:bg-gray-200 text-white dark:text-gray-900 font-semibold py-3 px-4 rounded-md hover:bg-gray-700 dark:hover:bg-gray-300 transition-colors disabled:bg-gray-200 dark:disabled:bg-gray-700 disabled:text-gray-500 dark:disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader className="text-white dark:text-gray-900" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Bot size={20} />
                    Analyze Resume
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg border border-gray-200 dark:border-gray-700">
               <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
                  <Bot className="text-gray-400 dark:text-gray-500" />
                  AI Analysis
               </h2>
              {isLoading && !selectedHistoryItem ? ( 
                <div className="flex flex-col items-center justify-center h-full min-h-[300px]">
                  <Loader className="h-10 w-10 text-gray-400 dark:text-gray-500" />
                  <p className="text-gray-500 dark:text-gray-400 mt-4 text-center">Analyzing your documents...<br/>This may take a moment.</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center p-6 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/10 animate-fade-in">
                  <div className="p-3 bg-red-100 dark:bg-red-800/30 rounded-full mb-4">
                    <AlertTriangle className="text-red-600 dark:text-red-400 w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">{error.title}</h3>
                  <p className="text-red-700 dark:text-red-300 mb-6 max-w-md">{error.message}</p>
                  
                  {error.details && (
                    <div className="w-full max-w-lg text-left mb-6">
                       <details className="group">
                         <summary className="list-none flex items-center justify-center gap-2 cursor-pointer text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 transition-colors focus:outline-none">
                            <span>Show Technical Details</span>
                            <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform duration-200" />
                         </summary>
                         <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded border border-red-100 dark:border-red-900/30 overflow-auto max-h-48 shadow-inner">
                            <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap break-all">
                                {error.details}
                            </pre>
                         </div>
                       </details>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => setError(null)}
                    className="px-6 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 rounded-md shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-offset-gray-800"
                  >
                    Try Again
                  </button>
                </div>
              ) : selectedHistoryItem ? (
                <>
                  <ResultsDisplay result={selectedHistoryItem.result} theme={theme} />
                  <div className="mt-8 text-center">
                    <button
                      onClick={handleExport}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors"
                      aria-label="Export analysis results to a PDF file"
                    >
                      <Download size={16} />
                      Export Analysis Report (PDF)
                    </button>
                  </div>
                </>
              ) : (
                 <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center text-gray-500 dark:text-gray-400">
                    <Bot size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                    <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-300">Ready for Feedback?</h3>
                    <p className="mt-2 max-w-sm">Upload your resume and paste a job description to get started. The AI analysis will appear here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
