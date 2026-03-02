import React, { useEffect, useRef } from 'react';
import { LabelTemplate, generateDataMatrixBase64 } from '@/lib/labelGenerator';
import { ProductItem } from '@/lib/xmlParser';

interface LabelPreviewProps {
  item: ProductItem;
  template: LabelTemplate;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({ item, template }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [barcodeUrl, setBarcodeUrl] = React.useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    if (item.fullCode) {
      generateDataMatrixBase64(item.fullCode).then(url => {
        if (mounted) setBarcodeUrl(url);
      }).catch(err => console.error(err));
    }
    return () => { mounted = false; };
  }, [item.fullCode]);

  // Calculate scale to fit in the container, but keep aspect ratio
  // We'll render it using CSS mm units
  
  return (
    <div className="flex flex-col items-center gap-2">
      <div 
        className="bg-white border border-slate-300 shadow-sm relative overflow-hidden flex"
        style={{
          width: `${template.width}mm`,
          height: `${template.height}mm`,
          padding: '2mm',
          boxSizing: 'border-box',
          flexDirection: template.layout === 'side-by-side' ? 'row' : 'col',
          alignItems: template.layout === 'side-by-side' ? 'flex-start' : 'center',
        }}
      >
        {template.layout === 'side-by-side' ? (
          <div className="flex w-full h-full p-1">
            {/* Left Side: Info */}
            <div className="flex flex-col flex-1 pr-1 h-full justify-between min-w-0">
              <div>
                {/* Logo */}
                <div className="flex items-center gap-1 mb-2">
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 5V0H5" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M9 0H14V5" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M14 9V14H9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M5 14H0V9" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M3 7L6 10L11 3" stroke="black" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <div className="flex flex-col leading-none">
                    <span className="text-[5px] font-bold">ЧЕСТНЫЙ</span>
                    <span className="text-[8px] font-bold">ЗНАК</span>
                  </div>
                </div>
                
                {/* Product Info */}
                <div className="font-bold text-[10pt] uppercase leading-tight mb-2 break-words">
                  ФУТБОЛКА<br/>ТРИКОТАЖНАЯ
                </div>
              </div>

              <div className="flex flex-col gap-1 pb-1">
                <div className="text-[7pt] leading-tight truncate">
                  <span className="text-slate-500">Цвет: </span>
                  <span className="font-bold">РАЗНОЦВЕТНЫЙ</span>
                </div>
                <div className="text-[7pt] leading-tight truncate">
                  <span className="text-slate-500">Состав: </span>
                  <span className="font-bold">100% х/б</span>
                </div>
              </div>
            </div>

            {/* Right Side: DataMatrix */}
            <div className="flex items-center justify-center h-full flex-shrink-0" style={{ width: '30mm' }}>
              {template.showDataMatrix && barcodeUrl && (
                <img 
                  src={barcodeUrl} 
                  alt="DataMatrix" 
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          /* Simple Layout (Centered) */
          <div className="flex flex-col items-center w-full h-full">
             {template.showDataMatrix && barcodeUrl && (
              <img 
                src={barcodeUrl} 
                alt="DataMatrix" 
                style={{
                  width: '60%',
                  height: '60%',
                  objectFit: 'contain',
                  marginBottom: '1mm'
                }}
              />
            )}
            <div className="text-center w-full flex flex-col items-center leading-tight" style={{ fontSize: `${template.fontSize}pt` }}>
              {template.showName && (
                <div className="font-medium truncate w-full px-1 mb-[1px]">{item.name}</div>
              )}
              {template.showGTIN && (
                <div className="text-slate-600" style={{ fontSize: '0.9em' }}>GTIN: {item.gtin}</div>
              )}
              {template.showSerial && (
                <div className="text-slate-600" style={{ fontSize: '0.9em' }}>SN: {item.serial}</div>
              )}
            </div>
          </div>
        )}
      </div>
      <span className="text-xs text-slate-400">Preview (Scaled)</span>
    </div>
  );
};
