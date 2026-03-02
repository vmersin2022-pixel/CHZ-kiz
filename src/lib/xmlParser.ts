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
    
    // Helper to find all nodes with a specific key recursively
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
    // In the provided file: <СведТов ...>
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
        return { items: [], errors: ["Не найдена информация о товарах (теги СведТов/Tov/СведТов/Тов)"] };
    }

    productNodes.forEach((node: any, index: number) => {
      try {
        // Attributes are prefixed with @_
        const name = node['@_НаимТов'] || node['@_NaimTov'] || node.NaimTov || node.Naim || node.НаимТов || node.Наим || `Товар ${index + 1}`;
        const quantityStr = node['@_КолТов'] || node['@_KolTov'] || node.KolTov || node.Kol || node.КолТов || node.Кол || "1";
        const quantity = parseFloat(quantityStr);
        
        // Try to find GTIN in attributes of ДопСведТов (DopSvedTov)
        // Structure: <СведТов ...> <ДопСведТов КодТов="..."> ... </ДопСведТов> </СведТов>
        let gtinFromAttr = "";
        if (node.ДопСведТов && node.ДопСведТов['@_КодТов']) {
            gtinFromAttr = node.ДопСведТов['@_КодТов'];
        } else if (node.DopSvedTov && node.DopSvedTov['@_KodTov']) {
            gtinFromAttr = node.DopSvedTov['@_KodTov'];
        }

        // Identification codes are usually in 'InfPolFKhZh2' or 'NomSredIdentTov'
        // We need to find the 'KIZ' (Control Identification Sign) or similar.
        
        let identNodes = findNodes(node, 'NomSredIdentTov');
        if (identNodes.length === 0) identNodes = findNodes(node, 'НомСредИдентТов');
        
        if (identNodes.length > 0) {
            identNodes.forEach((ident: any) => {
                // Check for KIZ (CIS) - usually base64 or hex, but here likely plain string in XML
                // Or KIGTIN + KISer
                
                // Case 1: KIZ (Full code)
                const kizValue = ident.KIZ || ident.КИЗ;
                if (kizValue) {
                    // Sometimes KIZ is a list
                    const kizList = Array.isArray(kizValue) ? kizValue : [kizValue];
                    kizList.forEach((k: string) => {
                        // If GTIN wasn't found in attributes, try to extract from code
                        const extractedGtin = extractGTIN(k);
                        const finalGtin = gtinFromAttr || extractedGtin;

                        items.push({
                            id: crypto.randomUUID(),
                            name,
                            gtin: finalGtin,
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
                     const gtin = gtinValue;
                     const serial = serialValue;
                     // Construct GS1 string: 01 + GTIN + 21 + Serial
                     const code = `01${gtin}21${serial}`; 
                     
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
            // OR at the next AI (91 or 93 etc) if no GS is used.
            
            // Try to split by GS (ASCII 29)
            const parts = afterAI21.split(String.fromCharCode(29));
            if (parts.length > 1) {
                return parts[0];
            }
            
            // Try to split by FNC1 (ASCII 232) - sometimes used
            const partsFnc1 = afterAI21.split(String.fromCharCode(232));
            if (partsFnc1.length > 1) {
                return partsFnc1[0];
            }

            // If no separator, for "Light Industry" (clothes), Serial is typically 13 chars.
            // For Shoes, it's also 13 chars.
            // For Tobacco, it's 7 chars.
            // We can try to guess based on length or common patterns.
            // Given the user's file is clothes (T-shirts), 13 is the standard.
            
            // If the string is long enough, take 13 chars.
            if (afterAI21.length >= 13) {
                 return afterAI21.substring(0, 13);
            }
            
            // Fallback: return everything if short
            return afterAI21;
        }
    }
    return "";
}
