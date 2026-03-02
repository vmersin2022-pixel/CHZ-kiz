import React, { useCallback } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadAreaProps {
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
  error?: string | null;
}

export const UploadArea: React.FC<UploadAreaProps> = ({ onFileSelect, isProcessing, error }) => {
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  }, [onFileSelect]);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      className={cn(
        "border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer",
        "hover:bg-slate-50 hover:border-slate-400",
        isProcessing ? "opacity-50 pointer-events-none" : "",
        error ? "border-red-300 bg-red-50" : "border-slate-300"
      )}
    >
      <input
        type="file"
        accept=".xml"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-4">
        <div className={cn("p-4 rounded-full", error ? "bg-red-100 text-red-600" : "bg-slate-100 text-slate-600")}>
          {error ? <AlertCircle size={32} /> : <Upload size={32} />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {error ? "Error Parsing File" : "Upload XML Document"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {error ? error : "Drag and drop your Honest Sign XML file here, or click to browse"}
          </p>
        </div>
      </label>
    </div>
  );
};
