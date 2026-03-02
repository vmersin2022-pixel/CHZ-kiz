import React from 'react';
import { LabelTemplate } from '../lib/labelGenerator';

interface LabelSettingsProps {
  template: LabelTemplate;
  onChange: (template: LabelTemplate) => void;
}

export const LabelSettings: React.FC<LabelSettingsProps> = ({ template, onChange }) => {
  const handleChange = (key: keyof LabelTemplate, value: any) => {
    onChange({ ...template, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Макет</label>
        <select
          value={template.layout}
          onChange={(e) => handleChange('layout', e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
        >
          <option value="side-by-side">С логотипом (58x40)</option>
          <option value="simple">Простой (Центрированный)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Ширина (мм)</label>
          <input
            type="number"
            value={template.width}
            onChange={(e) => handleChange('width', parseInt(e.target.value))}
            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Высота (мм)</label>
          <input
            type="number"
            value={template.height}
            onChange={(e) => handleChange('height', parseInt(e.target.value))}
            className="w-full border-slate-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.showDataMatrix}
            onChange={(e) => handleChange('showDataMatrix', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Показывать DataMatrix</span>
        </label>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.showName}
            onChange={(e) => handleChange('showName', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Показывать название</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.showGTIN}
            onChange={(e) => handleChange('showGTIN', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Показывать GTIN</span>
        </label>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={template.showSerial}
            onChange={(e) => handleChange('showSerial', e.target.checked)}
            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-slate-700">Показывать Серийный номер</span>
        </label>
      </div>
    </div>
  );
};
