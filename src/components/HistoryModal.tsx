import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { X, Calendar, FileText, Printer, Loader2 } from 'lucide-react';
import { getPrintSessions, PrintSession } from '@/lib/db';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose }) => {
  const [sessions, setSessions] = useState<PrintSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await getPrintSessions();
      setSessions(data);
    } catch (error) {
      console.error("Failed to load history", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <Card className="w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
          <CardTitle className="text-xl flex items-center gap-2">
            <Printer className="h-5 w-5" />
            История печати
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0 rounded-full">
            <X size={20} />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin mb-2" />
              <p>Загрузка истории...</p>
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Calendar className="h-12 w-12 mb-4 opacity-20" />
              <p>История печати пуста</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 hover:bg-slate-50 transition-colors">
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium text-slate-900 flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      {session.filename || "Без названия"}
                    </h3>
                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                      {new Date(session.created_at).toLocaleString('ru-RU')}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-slate-600 pl-6">
                    <div>
                      Напечатано кодов: <span className="font-semibold text-slate-900">{session.total_codes}</span>
                    </div>
                    {session.notes && (
                        <div className="text-xs text-slate-400 italic max-w-[200px] truncate" title={session.notes}>
                            {session.notes}
                        </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-lg flex justify-end">
            <Button variant="outline" onClick={onClose}>
                Закрыть
            </Button>
        </div>
      </Card>
    </div>
  );
};
