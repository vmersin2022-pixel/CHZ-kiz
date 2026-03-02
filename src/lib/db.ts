import { supabase } from './supabase';
import { parseXML } from './xmlParser';

export async function uploadSession(file: File, xmlContent: string) {
  const codes = parseXML(xmlContent);
  if (codes.length === 0) {
    throw new Error('No codes found in XML');
  }

  // 1. Create Session
  const { data: session, error: sessionError } = await supabase
    .from('print_sessions')
    .insert({
      filename: file.name,
      total_codes: codes.length,
      notes: `Imported on ${new Date().toLocaleString()}`
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  // 2. Prepare Codes for Insertion
  // We need to batch inserts because Supabase has a limit on request size
  const BATCH_SIZE = 100;
  const chunks = [];
  
  for (let i = 0; i < codes.length; i += BATCH_SIZE) {
    chunks.push(codes.slice(i, i + BATCH_SIZE));
  }

  let insertedCount = 0;

  for (const chunk of chunks) {
    const rows = chunk.map(code => ({
      session_id: session.id,
      gtin: code.gtin,
      serial: code.serial,
      full_code: code.fullCode,
      product_name: code.productName,
      attributes: {
        // We might parse attributes from XML if available, 
        // for now we store what we have or empty
      },
      is_printed: false
    }));

    const { error: codesError } = await supabase
      .from('print_codes')
      .insert(rows);

    if (codesError) {
      console.error('Error inserting batch', codesError);
      // Optional: Handle partial failure or retry
    } else {
      insertedCount += rows.length;
    }
  }

  return session;
}

export async function getSessions() {
  const { data, error } = await supabase
    .from('print_sessions')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
}

export async function getGtinGroups(sessionId: string) {
  // Supabase doesn't support "GROUP BY" easily in the JS client for counting 
  // without using .rpc() or raw SQL, but we can fetch counts using separate queries 
  // or fetch all distinct GTINs first.
  
  // Approach: Get distinct GTINs first
  // Note: .distinct() is not directly available on select without a specific column, 
  // usually we use .select('gtin').range(0,1000) etc. 
  // But a better way for "stats" is often a view or an RPC.
  // For simplicity, let's fetch all codes (lightweight columns) or use a workaround.
  
  // Actually, for 4000 codes, fetching just GTIN and is_printed status is fine.
  const { data, error } = await supabase
    .from('print_codes')
    .select('gtin, is_printed, product_name')
    .eq('session_id', sessionId);

  if (error) throw error;

  // Process in JS
  const groups: Record<string, { 
    gtin: string, 
    productName: string, 
    total: number, 
    printed: number 
  }> = {};

  data.forEach(row => {
    if (!groups[row.gtin]) {
      groups[row.gtin] = {
        gtin: row.gtin,
        productName: row.product_name || 'Неизвестный товар',
        total: 0,
        printed: 0
      };
    }
    groups[row.gtin].total++;
    if (row.is_printed) {
      groups[row.gtin].printed++;
    }
  });

  return Object.values(groups);
}

export async function fetchCodesForPrinting(sessionId: string, gtin: string, limit: number) {
  const { data, error } = await supabase
    .from('print_codes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('gtin', gtin)
    .eq('is_printed', false)
    .limit(limit);
  
  if (error) throw error;
  return data;
}

export async function markCodesAsPrinted(ids: string[]) {
  const { error } = await supabase
    .from('print_codes')
    .update({ 
      is_printed: true, 
      printed_at: new Date().toISOString() 
    })
    .in('id', ids);
  
  if (error) throw error;
}
