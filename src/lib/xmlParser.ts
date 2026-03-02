import { XMLParser } from "fast-xml-parser";

export interface ProductItem {
  id: string;
  name: string;
  gtin: string;
  serial: string;
  fullCode: string; // The full DataMatrix string
  quantity: number;
  rawCode: string; // Original code from XML
}

export interface ParseResult {
  items: ProductItem[];
  errors: string[];
}

export const parseXML = (xmlContent: string): ParseResult => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  
  const items: ProductItem[] = [];
  const errors: string[] = [];

  try {
    const jsonObj = parser.parse(xmlContent);
    
    // Attempt to find the document root. Common root is 'File' -> 'Document' -> 'Table'
    // But structure varies greatly. We'll search recursively for product nodes or specific tags.
    
    // Strategy: Flatten the object and look for arrays of products or specific keys like 'KIZ', 'NaimTov'
    // For this demo, we'll implement a heuristic for standard UPD (Universal Transfer Document) format.
    
    // Standard UPD structure often has: Файл -> Документ -> ТаблСчФакт -> СведТов
    // In English transliteration: File -> Dokument -> TablSchFakt -> SvedTov
    
    let documentNode = jsonObj?.File?.Dokument;
    if (!documentNode) {
       // Try finding any node that looks like a document root
       const keys = Object.keys(jsonObj);
       if (keys.length > 0) documentNode = jsonObj[keys[0]];
    }

    if (!documentNode) {
      return { items: [], errors: ["Could not find document root"] };
    }

    // Helper to find all nodes with a specific key
    const findNodes = (obj: any, key: string): any[] => {
      let results: any[] = [];
      if (!obj) return results;
      
      if (Array.isArray(obj)) {
        obj.forEach(item => {
          results = results.concat(findNodes(item, key));
        });
      } else if (typeof obj === 'object') {
        if (obj[key]) {
            const val = obj[key];
            if (Array.isArray(val)) results = results.concat(val);
            else results.push(val);
        }
        Object.keys(obj).forEach(k => {
          if (k !== key) {
            results = results.concat(findNodes(obj[k], key));
          }
        });
      }
      return results;
    };

    // Look for 'SvedTov' (Product Info) or similar
    let productNodes = findNodes(jsonObj, 'SvedTov');
    if (productNodes.length === 0) productNodes = findNodes(jsonObj, 'СведТов');
    
    // If no SvedTov, try 'Tov'
    if (productNodes.length === 0) {
        productNodes = findNodes(jsonObj, 'Tov');
    }
    if (productNodes.length === 0) {
        productNodes = findNodes(jsonObj, 'Тов');
    }

    if (productNodes.length === 0) {
        return { items: [], errors: ["No product nodes found (SvedTov/Tov/СведТов/Тов)"] };
    }

    productNodes.forEach((node: any, index: number) => {
      try {
        const name = node.NaimTov || node.Naim || node.НаимТов || node.Наим || `Product ${index + 1}`;
        const quantity = parseFloat(node.KolTov || node.Kol || node.КолТов || node.Кол || "1");
        
        // Identification codes are usually in 'InfPolFKhZh2' or 'NomSredIdentTov'
        // We need to find the 'KIZ' (Control Identification Sign) or similar.
        
        let identNodes = findNodes(node, 'NomSredIdentTov');
        if (identNodes.length === 0) identNodes = findNodes(node, 'НомСредИдентТов');
        
        if (identNodes.length > 0) {
            identNodes.forEach((ident: any) => {
                // Check for KIZ (CIS) - usually base64 or hex, but here likely plain string in XML
                // Or KIGTIN + KISer
                
                let code = "";
                let gtin = "";
                let serial = "";
                
                // Case 1: KIZ (Full code)
                const kizValue = ident.KIZ || ident.КИЗ;
                if (kizValue) {
                    // Sometimes KIZ is a list
                    const kizList = Array.isArray(kizValue) ? kizValue : [kizValue];
                    kizList.forEach((k: string) => {
                        items.push({
                            id: crypto.randomUUID(),
                            name,
                            gtin: extractGTIN(k),
                            serial: extractSerial(k),
                            fullCode: k,
                            quantity: 1, // Usually KIZ is unique per item
                            rawCode: k
                        });
                    });
                    return; // Done with this ident node
                }
                
                // Case 2: GTIN + Serial
                const gtinValue = ident.KIGTIN || ident.КИГТИН;
                const serialValue = ident.KISer || ident.КИСер;

                if (gtinValue && serialValue) {
                     gtin = gtinValue;
                     serial = serialValue;
                     // Construct GS1 string: 01 + GTIN + 21 + Serial
                     // Note: This is a simplification. Real GS1 has separators.
                     // We will format it properly in the generator.
                     code = `01${gtin}21${serial}`; 
                     
                     items.push({
                        id: crypto.randomUUID(),
                        name,
                        gtin,
                        serial,
                        fullCode: code,
                        quantity: 1,
                        rawCode: code
                    });
                }
            });
        } else {
            // If no specific codes found, but quantity > 0, we might just have product info without codes
            // Or codes are in a different place. For now, we skip if no codes found, 
            // OR we add a placeholder if the user wants to print generic labels.
            // Requirement says "extract codes", so we skip if no codes.
            // errors.push(`No codes found for product: ${name}`);
        }

      } catch (e) {
        errors.push(`Error parsing product node ${index}: ${(e as Error).message}`);
      }
    });

  } catch (e) {
    errors.push(`XML Parsing Error: ${(e as Error).message}`);
  }

  return { items, errors };
};

// Helpers to extract GTIN/Serial from a full GS1 DataMatrix string
// Standard format: (01)GTIN(21)SERIAL(91)KEY(92)CRYPTO
// The input string might contain brackets or might be plain numbers/chars.
// It might also contain special characters like <GS> (ASCII 29) as separators.

function extractGTIN(code: string): string {
    // Remove brackets if present (e.g. (01)...)
    const cleanCode = code.replace(/\(01\)/, '01');
    
    if (cleanCode.startsWith('01') && cleanCode.length >= 16) {
        return cleanCode.substring(2, 16);
    }
    return "";
}

function extractSerial(code: string): string {
    // Remove brackets if present
    let cleanCode = code.replace(/\(01\)/, '01').replace(/\(21\)/, '21');
    
    // Find the position of '21' after the GTIN (which is at index 2, length 14 -> ends at 16)
    // So '21' should be at index 16.
    if (cleanCode.startsWith('01') && cleanCode.length > 18) {
        // Verify '21' AI is present
        if (cleanCode.substring(16, 18) === '21') {
            const afterAI21 = cleanCode.substring(18);
            
            // Serial ends at the first GS (Group Separator, \u001D) 
            // OR at the next AI (91 or 93 etc) if no GS is used (fixed length? no, serial is variable).
            // However, in DataMatrix for Chestny Znak, the Serial is typically followed by 
            // GS (0x1D) then 91... or 92...
            // Sometimes in XML it is just a string without GS, but usually the Serial is 13 chars (for shoes/clothes) 
            // or 7 chars (for tobacco).
            // For "Light Industry" (clothes), Serial is 13 chars.
            
            // Try to split by GS
            const parts = afterAI21.split(String.fromCharCode(29));
            if (parts.length > 1) {
                return parts[0];
            }
            
            // If no GS, try to find next AI '91' or '92' or '93'
            // This is heuristic and might fail if Serial contains "91".
            // But for Chestny Znak, the order is usually fixed.
            // Let's assume standard Chestny Znak format: 01...21...91...92...
            // Serial is usually 13 chars for this category.
            
            // Check if we have '91' or '92' later in the string
            // A safer bet for this specific use case (Clothes) is taking 13 chars if available.
            // But let's try to be dynamic.
            
            // Regex to find next AI start? 
            // It's hard without GS. 
            // Let's assume 13 chars for now as it's standard for this product group.
            return afterAI21.substring(0, 13);
        }
    }
    return "";
}
