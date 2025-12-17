import React from 'react';
import type { AnalysisHistoryItem } from '../types';
import { History, Trash2, FileText } from 'lucide-react';

interface HistoryPanelProps {
  history: AnalysisHistoryItem[];
  onSelectItem: (item: AnalysisHistoryItem) => void;
  selectedItem: AnalysisHistoryItem | null;
  onClearHistory: () => void;
}

const FileTypeIcon: React.FC<{ fileName: string }> = ({ fileName }) => {
  const extension = fileName.split('.').pop()?.toLowerCase();
  let iconColor = 'text-gray-400 dark:text-gray-500';

  switch (extension) {
    case 'pdf':
      iconColor = 'text-red-600 dark:text-red-500';
      break;
    case 'docx':
      iconColor = 'text-blue-600 dark:text-blue-500';
      break;
    case 'txt':
    case 'md':
      iconColor = 'text-gray-600 dark:text-gray-400';
      break;
  }

  return <FileText size={18} className={`flex-shrink-0 ${iconColor}`} aria-label={`${extension} file`} />;
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ history, onSelectItem, selectedItem, onClearHistory }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-6 md:p-8 rounded-lg border border-gray-200 dark:border-gray-700 h-full flex flex-col">
      <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-3">
        <History className="text-gray-400 dark:text-gray-500" />
        Analysis History
      </h2>
      <div className="flex-grow overflow-y-auto pr-1">
        {history.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-10">
            <p>No analysis history yet.</p>
            <p className="text-sm">Complete an analysis to see it here.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((item) => {
              const isSelected = selectedItem?.id === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => onSelectItem(item)}
                    className={`w-full text-left p-3 rounded-md border-l-4 transition-colors ${
                      isSelected
                        ? 'bg-gray-100 dark:bg-gray-700/50 border-gray-800 dark:border-gray-300'
                        : 'border-transparent hover:bg-gray-100 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <div className="flex justify-between items-center gap-2">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <FileTypeIcon fileName={item.fileName} />
                        <p className={`font-semibold truncate ${isSelected ? 'text-gray-900 dark:text-gray-100' : 'text-gray-800 dark:text-gray-200'}`}>
                          {item.fileName}
                        </p>
                      </div>
                      <span
                        className="font-bold text-lg text-gray-800 dark:text-gray-100 flex-shrink-0"
                      >
                        {item.result.score}%
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.date}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
       {history.length > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 text-center">
          <button
            onClick={onClearHistory}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-red-700 dark:hover:text-red-500 bg-gray-100 dark:bg-gray-700/50 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-md transition-colors"
            aria-label="Clear all analysis history"
          >
            <Trash2 size={14} />
            Clear History
          </button>
        </div>
      )}
    </div>
  );
};
