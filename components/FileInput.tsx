import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker path for pdfjs from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.5.136/pdf.worker.min.mjs`;

// Declare mammoth for the global script included in index.html
declare const mammoth: any;

interface FileInputProps {
  onFileParsed: (data: { file: File, text: string } | null, error?: string) => void;
}

export const FileInput: React.FC<FileInputProps> = ({ onFileParsed }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseFile = async (file: File) => {
    setIsParsing(true);
    setFileName(file.name);
    try {
      let text = '';
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text += content.items.map((item: any) => item.str).join(' ');
        }
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;
      } else if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        text = await file.text();
      } else {
        throw new Error('Unsupported file type.');
      }
      onFileParsed({ file, text });
    } catch (e: any) {
      console.error("Error reading file:", e);
      const message = e.message === 'Unsupported file type.' 
        ? 'Unsupported file type. Please use .pdf, .docx, .txt, or .md.'
        : 'Error reading file. The file might be corrupted.';
      onFileParsed(null, message);
      setFileName(null); // Clear filename on error
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      parseFile(file);
    }
  };

  const handleRemoveFile = () => {
    setFileName(null);
    onFileParsed(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
  };
  
  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] || null;
     if (file) {
      parseFile(file);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Upload Your Resume
      </label>
      {isParsing ? (
        <div className="flex items-center justify-center w-full h-32 px-4 transition bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md">
          <Loader2 className="w-6 h-6 text-gray-500 dark:text-gray-400 animate-spin" />
          <span className="font-medium text-gray-600 dark:text-gray-300 ml-3">Parsing file...</span>
        </div>
      ) : !fileName ? (
        <label
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex justify-center w-full h-32 px-4 transition bg-white dark:bg-gray-800 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md appearance-none cursor-pointer hover:border-gray-400 dark:hover:border-gray-500 focus:outline-none"
        >
          <span className="flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-gray-400 dark:text-gray-500" />
            <span className="font-medium text-gray-600 dark:text-gray-300">
              Drop file or{' '}
              <span className="text-gray-900 dark:text-gray-100 underline">browse</span>
            </span>
          </span>
          <input
            type="file"
            name="file_upload"
            className="hidden"
            accept=".pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
            ref={fileInputRef}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
            <div className="flex items-center gap-2 overflow-hidden">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300 flex-shrink-0" />
                <span className="text-sm font-medium text-gray-800 dark:text-gray-100 truncate">{fileName}</span>
            </div>
            <button onClick={handleRemoveFile} className="text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-500 flex-shrink-0 ml-2">
                <X className="w-5 h-5" />
            </button>
        </div>
      )}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Supports .pdf, .docx, .txt, and .md files.</p>
    </div>
  );
};