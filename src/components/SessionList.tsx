import React, { useState, useEffect } from 'react';
import { getSessions } from '../lib/db';
import { PrintSession } from '../lib/supabase';
import { Upload, FileText, ArrowRight, Loader2 } from 'lucide-react';

interface SessionListProps {
  onSelectSession: (session: PrintSession) => void;
  onNewSession: () => void;
}

export const SessionList: React.FC<SessionListProps> = ({ onSelectSession, onNewSession }) => {
  const [sessions, setSessions] = useState<PrintSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const data = await getSessions();
      setSessions(data || []);
    } catch (err) {
      console.error('Error fetching sessions:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-slate-800">История загрузок</h1>
        <button
          onClick={onNewSession}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Upload size={20} />
          Загрузить новый файл
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-slate-400" size={32} />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <FileText className="mx-auto text-slate-300 mb-4" size={48} />
          <p className="text-slate-500 text-lg mb-2">История пуста</p>
          <p className="text-slate-400 text-sm">Загрузите первый XML файл, чтобы начать работу</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sessions.map((session) => (
            <div
              key={session.id}
              onClick={() => onSelectSession(session)}
              className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 transition-colors">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800 mb-1">{session.filename}</h3>
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <span>{new Date(session.created_at).toLocaleString()}</span>
                    <span>•</span>
                    <span>{session.total_codes} кодов</span>
                  </div>
                </div>
              </div>
              <ArrowRight className="text-slate-300 group-hover:text-blue-500 transition-colors" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
