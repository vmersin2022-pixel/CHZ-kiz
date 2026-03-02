import React from 'react';
import { LabelTemplate, DEFAULT_TEMPLATES } from '@/lib/labelGenerator';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

interface TemplateSelectorProps {
  selectedId: string;
  onSelect: (template: LabelTemplate) => void;
}

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selectedId, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {DEFAULT_TEMPLATES.map((template) => (
        <div
          key={template.id}
          onClick={() => onSelect(template)}
          className={cn(
            "relative cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md",
            selectedId === template.id
              ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
              : "border-slate-200 bg-white hover:border-slate-300"
          )}
        >
          <div className="flex justify-between items-start mb-2">
            <h4 className="font-medium text-slate-900">{template.name}</h4>
            {selectedId === template.id && (
              <div className="bg-slate-900 text-white rounded-full p-0.5">
                <Check size={12} />
              </div>
            )}
          </div>
          <p className="text-xs text-slate-500 mb-4">
            {template.width}mm × {template.height}mm
          </p>
          
          {/* Mini Preview */}
          <div 
            className="border border-slate-200 bg-white mx-auto flex flex-col items-center justify-center p-2 gap-1"
            style={{ 
              aspectRatio: `${template.width}/${template.height}`,
              width: '100%',
              maxHeight: '80px'
            }}
          >
            <div className="w-8 h-8 bg-slate-800 rounded-sm opacity-20" />
            <div className="w-3/4 h-1 bg-slate-200 rounded-full" />
            <div className="w-1/2 h-1 bg-slate-200 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
};
