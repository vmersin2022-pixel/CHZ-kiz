import { supabase } from './supabaseClient';
import { ProductItem } from './xmlParser';

export async function checkPrintedCodes(
  items: ProductItem[], 
  onProgress?: (current: number, total: number) => void
): Promise<Set<string>> {
  if (items.length === 0) return new Set();

  const codes = items.map(i => i.fullCode).filter(Boolean);
  
  // Use the RPC function for reliable checking (handles special chars better)
  // Chunking is still good practice for large arrays
  const printedCodes = new Set<string>();
  const chunkSize = 200; // RPC can handle larger chunks
  const total = codes.length;
  let processed = 0;

  for (let i = 0; i < codes.length; i += chunkSize) {
    const chunk = codes.slice(i, i + chunkSize);
    
    const { data, error } = await supabase
      .rpc('check_printed_codes', { codes: chunk });

    if (error) {
      console.error('Error checking printed codes via RPC:', error);
      continue;
    }

    if (data) {
      // data is an array of strings (full_code)
      data.forEach((code: string) => printedCodes.add(code));
    }

    processed += chunk.length;
    if (onProgress) {
        onProgress(Math.min(processed, total), total);
    }
  }

  return printedCodes;
}

export async function createPrintSession(fileName: string, totalCodes: number): Promise<string | null> {
  const { data, error } = await supabase
    .from('print_sessions')
    .insert({
      filename: fileName,
      total_codes: totalCodes,
      notes: `Imported on ${new Date().toLocaleString()}`
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating print session:', error);
    return null;
  }

  return data?.id || null;
}

export async function recordPrintedCodes(items: ProductItem[], sessionId: string | null) {
  if (items.length === 0) return;

  const rows = items.map(item => ({
    full_code: item.fullCode,
    gtin: item.gtin,
    serial: item.serial,
    product_name: item.name,
    is_printed: true,
    printed_at: new Date().toISOString(),
    session_id: sessionId
  }));

  // Chunking to prevent request size limits
  const chunkSize = 500;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('print_codes')
      .upsert(chunk, { onConflict: 'full_code' });

    if (error) {
      console.error(`Error recording chunk ${i}-${i+chunkSize}:`, error);
      // We continue trying to save other chunks even if one fails
    }
  }
}
