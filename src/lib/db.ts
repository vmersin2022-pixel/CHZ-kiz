import { supabase } from './supabaseClient';
import { ProductItem } from './xmlParser';

export async function checkPrintedCodes(items: ProductItem[]): Promise<Set<string>> {
  if (items.length === 0) return new Set();

  const codes = items.map(i => i.fullCode).filter(Boolean);
  
  // Supabase allows 'in' query for arrays
  // We chunk it just in case there are too many items
  const printedCodes = new Set<string>();
  const chunkSize = 1000;

  for (let i = 0; i < codes.length; i += chunkSize) {
    const chunk = codes.slice(i, i + chunkSize);
    
    const { data, error } = await supabase
      .from('print_codes')
      .select('full_code')
      .in('full_code', chunk)
      .eq('is_printed', true);

    if (error) {
      console.error('Error checking printed codes:', error);
      continue;
    }

    if (data) {
      data.forEach((row: any) => printedCodes.add(row.full_code));
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
