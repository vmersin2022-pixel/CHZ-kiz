import React, { useCallback, useState } from 'react';
import { Upload, FileText, AlertCircle, Loader2 } from 'lucide-react';

interface FileUploaderProps {
  onFileLoaded: (file: File, content: string) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processFile = (file: File) => {
    setError(null);
    if (!file.name.endsWith('.xml')) {
      setError('Пожалуйста, загрузите XML файл');
      return;
    }

    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        onFileLoaded(file, content);
      } else {
        setError('Не удалось прочитать файл');
      }
      setIsLoading(false);
    };
    reader.onerror = () => {
      setError('Ошибка чтения файла');
      setIsLoading(false);
    };
    reader.readAsText(file);
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-xl p-10 text-center transition-all cursor-pointer
        ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50'}
        ${error ? 'border-red-300 bg-red-50' : ''}
      `}
    >
      <input
        type="file"
        accept=".xml"
        onChange={handleChange}
        className="hidden"
        id="xml-upload"
        disabled={isLoading}
      />
      <label htmlFor="xml-upload" className="cursor-pointer flex flex-col items-center gap-4 w-full h-full">
        <div className={`p-4 rounded-full ${error ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
          {isLoading ? <Loader2 className="animate-spin" size={32} /> : error ? <AlertCircle size={32} /> : <Upload size={32} />}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-900">
            {isLoading ? "Обработка файла..." : error ? "Ошибка загрузки" : "Загрузите XML файл"}
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            {error ? error : "Перетащите файл сюда или нажмите для выбора"}
          </p>
        </div>
      </label>
    </div>
  );
};
