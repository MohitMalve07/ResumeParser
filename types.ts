
export interface AnalysisResult {
  score: number;
  overview: string;
  strengths: string[];
  improvements: string[];
}

export interface AnalysisHistoryItem {
  id: string;
  fileName: string;
  date: string;
  companyName?: string;
  result: AnalysisResult;
}
