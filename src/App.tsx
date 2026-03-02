import React, { useState } from 'react';
import { Settings } from 'lucide-react';
import { FileUploader } from './components/FileUploader';
import { LabelPreview } from './components/LabelPreview';
import { LabelSettings } from './components/LabelSettings';
import { SessionList } from './components/SessionList';
import { PrintDashboard } from './components/PrintDashboard';
import { LabelTemplate, defaultTemplate } from './lib/labelGenerator';
import { uploadSession } from './lib/db';
import { PrintSession } from './lib/supabase';

type ViewState = 'sessions' | 'upload' | 'print';

function App() {
  const [view, setView] = useState<ViewState>('sessions');
  const [currentSession, setCurrentSession] = useState<PrintSession | null>(null);
  const [template, setTemplate] = useState<LabelTemplate>(defaultTemplate);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (file: File, content: string) => {
    setIsUploading(true);
    try {
      const session = await uploadSession(file, content);
      setCurrentSession(session);
      setView('print');
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Ошибка загрузки файла в базу данных: ' + (error as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelectSession = (session: PrintSession) => {
    setCurrentSession(session);
    setView('print');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div 
            className="flex items-center gap-2 cursor-pointer" 
            onClick={() => setView('sessions')}
          >
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              ЧЗ
            </div>
            <span className="font-bold text-lg tracking-tight">ЧестныйПринт</span>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Template Settings Button - always visible or only in print view? */}
             {/* Let's keep it simple for now */}
          </div>
        </div>
      </header>

      <main>
        {view === 'sessions' && (
          <SessionList 
            onSelectSession={handleSelectSession} 
            onNewSession={() => setView('upload')} 
          />
        )}

        {view === 'upload' && (
          <div className="max-w-4xl mx-auto p-6">
            <button 
              onClick={() => setView('sessions')}
              className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-2"
            >
              ← Назад к истории
            </button>
            
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
              <h2 className="text-2xl font-bold mb-6 text-center">Загрузка нового файла</h2>
              {isUploading ? (
                <div className="text-center py-12">
                  <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-lg text-slate-600">Обработка и сохранение кодов в базу...</p>
                  <p className="text-sm text-slate-400 mt-2">Это может занять некоторое время для больших файлов</p>
                </div>
              ) : (
                <FileUploader onFileLoaded={handleFileUpload} />
              )}
            </div>
          </div>
        )}

        {view === 'print' && currentSession && (
          <div className="flex flex-col lg:flex-row h-[calc(100vh-64px)] overflow-hidden">
            {/* Left: Dashboard */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              <PrintDashboard 
                session={currentSession} 
                onBack={() => setView('sessions')}
                template={template}
              />
            </div>

            {/* Right: Preview & Settings (Collapsible or Fixed) */}
            <div className="w-full lg:w-[400px] bg-white border-l border-slate-200 flex flex-col h-full overflow-y-auto">
              <div className="p-4 border-b border-slate-100">
                <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Settings size={18} />
                  Настройки этикетки
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Эти настройки применятся ко всем печатаемым этикеткам
                </p>
                <LabelSettings 
                  template={template} 
                  onChange={setTemplate} 
                />
              </div>
              
              <div className="p-4 flex-1 bg-slate-100 flex flex-col items-center justify-center min-h-[300px]">
                <div className="text-xs text-slate-400 mb-2 uppercase font-bold tracking-wider">Предпросмотр</div>
                <div className="bg-white shadow-lg" style={{ width: '58mm', height: '40mm' }}>
                  <LabelPreview 
                    template={template} 
                    sampleData={{
                      name: "ФУТБОЛКА ТРИКОТАЖНАЯ",
                      gtin: "04600000000000",
                      serial: "SAMPLE123",
                      fullCode: "010460000000000021SAMPLE123"
                    }} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
