import bwipjs from 'bwip-js';
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { ProductItem } from './xmlParser';

// Initialize vfs for pdfmake
// @ts-ignore
if (pdfFonts && pdfFonts.pdfMake && pdfFonts.pdfMake.vfs) {
    // @ts-ignore
    pdfMake.vfs = pdfFonts.pdfMake.vfs;
} else if (pdfFonts && (pdfFonts as any).vfs) {
    // @ts-ignore
    pdfMake.vfs = (pdfFonts as any).vfs;
}

// Define fonts - Roboto is included in standard vfs_fonts
pdfMake.fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf'
  }
};

export interface LabelTemplate {
  id: string;
  name: string;
  width: number; // mm
  height: number; // mm
  fontSize: number; // pt
  showName: boolean;
  showGTIN: boolean;
  showSerial: boolean;
  showDataMatrix: boolean;
  layout: 'simple' | 'side-by-side';
}

export const DEFAULT_TEMPLATES: LabelTemplate[] = [
  {
    id: '58x40',
    name: 'Standard 58x40mm (Side-by-Side)',
    width: 58,
    height: 40,
    fontSize: 7,
    showName: true,
    showGTIN: true,
    showSerial: true,
    showDataMatrix: true,
    layout: 'side-by-side',
  },
  {
    id: '43x25',
    name: 'Small 43x25mm',
    width: 43,
    height: 25,
    fontSize: 6,
    showName: true,
    showGTIN: true,
    showSerial: false,
    showDataMatrix: true,
    layout: 'simple',
  },
  {
    id: '30x20',
    name: 'Tiny 30x20mm',
    width: 30,
    height: 20,
    fontSize: 5,
    showName: false,
    showGTIN: true,
    showSerial: false,
    showDataMatrix: true,
    layout: 'simple',
  },
];

export const generateDataMatrixBase64 = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    try {
      bwipjs.toCanvas(canvas, {
        bcid: 'datamatrix',       // Barcode type
        text: text,               // Text to encode
        scale: 4,                 // 4x scaling factor (better for 300dpi)
        height: 10,               // Bar height, in millimeters
        includetext: false,       // Show human-readable text
        textxalign: 'center',     // Always good to set this
      });
      resolve(canvas.toDataURL('image/png'));
    } catch (e) {
      reject(e);
    }
  });
};

const mmToPt = (mm: number) => mm * 2.83465;

export const generatePDF = async (items: ProductItem[], template: LabelTemplate) => {
  const content: any[] = [];
  
  // Calculate dimensions in points
  const widthPt = mmToPt(template.width);
  const heightPt = mmToPt(template.height);
  
  // Process items
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const isLast = i === items.length - 1;
    
    try {
      const imgData = await generateDataMatrixBase64(item.fullCode);
      
      let pageContent: any;

      if (template.layout === 'side-by-side') {
        // Side-by-Side Layout (Left: Logo + Info, Right: DataMatrix)
        
        // Label size: 58mm x 40mm
        // Reduce DataMatrix size to 30mm to prevent cutoff and ensure quiet zone.
        const dmSizeMm = 30;
        const dmSizePt = mmToPt(dmSizeMm);
        
        pageContent = {
          columns: [
            {
              // Left Column: Info
              width: '*',
              stack: [
                // Logo "Честный ЗНАК"
                {
                  columns: [
                    {
                      width: 14,
                      canvas: [
                         // Corners
                         { type: 'polyline', lineWidth: 2, lineCap: 'round', points: [{x: 0, y: 5}, {x: 0, y: 0}, {x: 5, y: 0}] }, // TL
                         { type: 'polyline', lineWidth: 2, lineCap: 'round', points: [{x: 9, y: 0}, {x: 14, y: 0}, {x: 14, y: 5}] }, // TR
                         { type: 'polyline', lineWidth: 2, lineCap: 'round', points: [{x: 14, y: 9}, {x: 14, y: 14}, {x: 9, y: 14}] }, // BR
                         { type: 'polyline', lineWidth: 2, lineCap: 'round', points: [{x: 5, y: 14}, {x: 0, y: 14}, {x: 0, y: 9}] }, // BL
                         // Checkmark
                         { type: 'polyline', lineWidth: 2, lineCap: 'round', points: [{x: 3, y: 7}, {x: 6, y: 10}, {x: 11, y: 3}] }
                      ]
                    },
                    {
                      width: '*',
                      stack: [
                        { text: 'ЧЕСТНЫЙ', fontSize: 5, bold: true, margin: [0, 1, 0, 0] },
                        { text: 'ЗНАК', fontSize: 7.5, bold: true, margin: [0, -2, 0, 0] }
                      ],
                      margin: [3, 0, 0, 0]
                    }
                  ],
                  margin: [0, 0, 0, 6]
                },
                
                // Product Name
                {
                  text: "ФУТБОЛКА\nТРИКОТАЖНАЯ", 
                  fontSize: 10, // Slightly reduced to fit better
                  bold: true,
                  lineHeight: 1.1,
                  margin: [0, 0, 0, 6]
                },
                // Attributes
                {
                  text: [
                    { text: 'Цвет: ', color: 'gray', fontSize: 7 },
                    { text: 'РАЗНОЦВЕТНЫЙ', bold: true, fontSize: 7 }
                  ],
                  margin: [0, 0, 0, 2]
                },
                {
                  text: [
                    { text: 'Состав: ', color: 'gray', fontSize: 7 },
                    { text: '100% х/б', bold: true, fontSize: 7 }
                  ]
                }
              ]
            },
            {
              // Right Column: DataMatrix
              width: dmSizePt,
              image: imgData,
              width: dmSizePt,
              height: dmSizePt,
              alignment: 'right',
              margin: [0, (heightPt - dmSizePt) / 2 - 2, 0, 0] // Vertically center
            }
          ],
          columnGap: 2 // Reduced gap
        };
        
      } else {
        // Simple Centered Layout
        const dmSize = Math.min(template.width, template.height) * 0.6;
        
        pageContent = {
          stack: [
            {
              image: imgData,
              width: mmToPt(dmSize),
              height: mmToPt(dmSize),
              alignment: 'center',
              margin: [0, 5, 0, 5]
            },
            template.showName ? {
              text: item.name.length > 30 ? item.name.substring(0, 30) + '...' : item.name,
              fontSize: template.fontSize,
              alignment: 'center',
              margin: [0, 0, 0, 2]
            } : {},
            template.showGTIN ? {
              text: `GTIN: ${item.gtin}`,
              fontSize: template.fontSize - 1,
              alignment: 'center'
            } : {},
            (template.showSerial && item.serial) ? {
              text: `SN: ${item.serial}`,
              fontSize: template.fontSize - 1,
              alignment: 'center'
            } : {}
          ]
        };
      }

      // Wrap content in a container that forces page break
      content.push({
        ...pageContent,
        pageBreak: isLast ? undefined : 'after'
      });

    } catch (e) {
      console.error("Error generating label for item", item, e);
    }
  }

  const docDefinition = {
    pageSize: { width: widthPt, height: heightPt },
    pageMargins: [2, 2, 2, 2], // Small margins
    content: content,
    defaultStyle: {
      font: 'Roboto'
    }
  };

  return pdfMake.createPdf(docDefinition);
};
