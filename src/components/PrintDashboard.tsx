import React, { useState, useEffect } from 'react';
import { PrintSession, getGtinGroups, fetchCodesForPrinting, markCodesAsPrinted } from '../lib/db';
import { generatePDF } from '../lib/labelGenerator';
import { LabelTemplate } from '../lib/labelGenerator';
import { Printer, CheckCircle, AlertCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

interface PrintDashboardProps {
  session: PrintSession;
  onBack: () => void;
  template: LabelTemplate;
}

interface GtinGroup {
  gtin: string;
  productName: string;
  total: number;
  printed: number;
}

export const PrintDashboard: React.FC<PrintDashboardProps> = ({ session, onBack, template }) => {
  const [groups, setGroups] = useState<GtinGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGtin, setExpandedGtin] = useState<string | null>(null);
  const [printQuantities, setPrintQuantities] = useState<Record<string, number>>({});
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    loadGroups();
  }, [session.id]);

  const loadGroups = async () => {
    try {
      const data = await getGtinGroups(session.id);
      setGroups(data);
    } catch (err) {
      console.error('Error loading groups:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async (gtin: string) => {
    const quantity = printQuantities[gtin] || 100;
    const group = groups.find(g => g.gtin === gtin);
    if (!group) return;

    const remaining = group.total - group.printed;
    const limit = Math.min(quantity, remaining);

    if (limit <= 0) {
      alert('Все коды для этого товара уже распечатаны!');
      return;
    }

    setProcessing(gtin);

    try {
      // 1. Fetch codes
      const codes = await fetchCodesForPrinting(session.id, gtin, limit);
      
      if (codes.length === 0) {
        alert('Не удалось получить коды для печати.');
        return;
      }

      // 2. Generate PDF
      // Map DB codes to the format expected by PDF generator
      const pdfItems = codes.map(c => ({
        id: c.id,
        name: c.product_name || 'Товар',
        gtin: c.gtin,
        serial: c.serial,
        fullCode: c.full_code,
        quantity: 1,
        rawCode: c.full_code
      }));

      await generatePDF(pdfItems, template);

      // 3. Mark as printed
      const ids = codes.map(c => c.id);
      await markCodesAsPrinted(ids);

      // 4. Refresh counts
      await loadGroups();

    } catch (err) {
      console.error('Print error:', err);
      alert('Ошибка при печати. Проверьте консоль.');
    } finally {
      setProcessing(null);
    }
  };

  const toggleExpand = (gtin: string) => {
    if (expandedGtin === gtin) {
      setExpandedGtin(null);
    } else {
      setExpandedGtin(gtin);
      // Set default quantity if not set
      if (!printQuantities[gtin]) {
        setPrintQuantities(prev => ({ ...prev, [gtin]: 100 }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center gap-4 mb-8">
        <button onClick={onBack} className="text-slate-500 hover:text-slate-800">
          ← Назад к списку
        </button>
        <h1 className="text-2xl font-bold text-slate-800">
          {session.filename}
        </h1>
      </div>

      <div className="grid gap-4">
        {groups.map((group) => {
          const progress = Math.round((group.printed / group.total) * 100);
          const isComplete = group.printed >= group.total;
          const isExpanded = expandedGtin === group.gtin;

          return (
            <div key={group.gtin} className={`bg-white rounded-xl border transition-all ${isExpanded ? 'border-blue-400 shadow-md' : 'border-slate-200'}`}>
              {/* Header */}
              <div 
                onClick={() => toggleExpand(group.gtin)}
                className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-50 rounded-t-xl"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className={`p-2 rounded-lg ${isComplete ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-600'}`}>
                    {isComplete ? <CheckCircle size={24} /> : <Printer size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800">{group.productName}</h3>
                    <div className="text-sm text-slate-500 font-mono">GTIN: {group.gtin}</div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-700">
                      {group.printed} / {group.total}
                    </div>
                    <div className="w-32 h-2 bg-slate-100 rounded-full mt-1 overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`} 
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded Content */}
              {isExpanded && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-xl">
                  <div className="flex items-end gap-4">
                    <div className="flex-1 max-w-xs">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        Количество для печати
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          max={group.total - group.printed}
                          value={printQuantities[group.gtin] || 100}
                          onChange={(e) => setPrintQuantities(prev => ({ ...prev, [group.gtin]: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                        <span className="text-sm text-slate-500 whitespace-nowrap">
                          из {group.total - group.printed} доступных
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={(e) => { e.stopPropagation(); handlePrint(group.gtin); }}
                      disabled={processing === group.gtin || isComplete}
                      className={`
                        flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors
                        ${isComplete 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                        }
                      `}
                    >
                      {processing === group.gtin ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Подготовка...
                        </>
                      ) : (
                        <>
                          <Printer size={20} />
                          Напечатать
                        </>
                      )}
                    </button>
                  </div>
                  
                  {!isComplete && (
                    <p className="mt-3 text-sm text-slate-500 flex items-center gap-2">
                      <AlertCircle size={16} />
                      Напечатанные коды будут отмечены в базе и не попадут в следующую партию.
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
