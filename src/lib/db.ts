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

export async function createPrintSession(fileName: string): Promise<string | null> {
  // Try to create a session. We assume 'print_sessions' has an 'id' that is generated automatically.
  // We'll try to pass a timestamp or just an empty object if possible, 
  // but usually passing a known field like 'created_at' or a metadata field is safer if it exists.
  // Since we don't know the exact schema of print_sessions other than ID, 
  // we will try to insert a default row. 
  // If there's a 'name' or 'file_name' column, it would be good to use it.
  
  // Strategy: Try to insert with no data (relying on defaults) and get ID.
  const { data, error } = await supabase
    .from('print_sessions')
    .insert({}) // Inserting empty object to trigger defaults
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
    session_id: sessionId // Can be null if session creation failed, but better to have it
  }));

  const { error } = await supabase
    .from('print_codes')
    .upsert(rows, { onConflict: 'full_code' }); // Upsert to avoid duplicates if code exists

  if (error) {
    console.error('Error recording printed codes:', error);
    throw error;
  }
}
