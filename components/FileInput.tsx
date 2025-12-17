import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, X, Loader2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';

// Configure PDF.js worker (Vite + Vercel safe)
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

// Declare mammoth (loaded globally via index.html)
declare const mammoth: any;

interface FileInputProps {
  onFileParsed: (
    data: { file: File; text: string } | null,
    error?: string
  ) => void;
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

      // ---------- PDF ----------
      if (
        file.type === 'application/pdf' ||
        file.name.toLowerCase().endsWith('.pdf')
      ) {
        const arrayBuffer = await file.arrayBuffer();

        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          text +=
            content.items.map((item: any) => item.str).join(' ') + '\n';
        }

      // ---------- DOCX ----------
      } else if (
        file.type ===
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        file.name.toLowerCase().endsWith('.docx')
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        text = result.value;

      // ---------- TXT / MD ----------
      } else if (
        file.type === 'text/plain' ||
        file.name.toLowerCase().endsWith('.txt') ||
        file.name.toLowerCase().endsWith('.md')
      ) {
        text = await file.text();

      } else {
        throw new Error('Unsupported file type.');
      }

      onFileParsed({ file, text });

    } catch (error: any) {
      console.error('Error reading file:', error);

      const message =
        error.message === 'Unsupported file type.'
          ? 'Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.'
          : 'Failed to read the file. The file may be corrupted.';

      onFileParsed(null, message);
      setFileName(null);

    } finally {
      setIsParsing(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) parseFile(file);
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
    const file = event.dataTransfer.files?.[0];
    if (file) parseFile(file);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Upload Your Resume
      </label>

      {isParsing ? (
        <div className="flex items-center justify-center w-full h-32 px-4 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-md">
          <Loader2 className="w-6 h-6 text-gray-500 dark:text-gray-400 animate-spin" />
          <span className="ml-3 text-gray-600 dark:text-gray-300">
            Parsing file...
          </span>
        </div>
      ) : !fileName ? (
        <label
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex justify-center w-full h-32 px-4 bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-md cursor-pointer hover:border-gray-400"
        >
          <span className="flex items-center space-x-2">
            <UploadCloud className="w-6 h-6 text-gray-400" />
            <span className="text-gray-600 dark:text-gray-300">
              Drop file or <span className="underline">browse</span>
            </span>
          </span>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept="application/pdf,.docx,.txt,.md"
            onChange={handleFileSelect}
          />
        </label>
      ) : (
        <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md">
          <div className="flex items-center gap-2 overflow-hidden">
            <FileText className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            <span className="truncate text-sm text-gray-800 dark:text-gray-100">
              {fileName}
            </span>
          </div>

          <button
            onClick={handleRemoveFile}
            className="text-gray-500 hover:text-red-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}

      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        Supports PDF, DOCX, TXT, and MD files.
      </p>
    </div>
  );
};
