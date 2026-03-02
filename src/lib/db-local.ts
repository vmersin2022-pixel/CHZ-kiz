import Dexie, { Table } from 'dexie';
import { PrintSession, PrintCode } from './supabase';

class LocalDatabase extends Dexie {
  print_sessions!: Table<PrintSession>;
  print_codes!: Table<PrintCode>;

  constructor() {
    super('LabelPrinterDB');
    this.version(1).stores({
      print_sessions: 'id, created_at',
      print_codes: 'id, session_id, gtin, is_printed'
    });
  }
}

export const db = new LocalDatabase();

export async function uploadSessionLocal(file: File, codes: any[]): Promise<PrintSession> {
  const sessionId = crypto.randomUUID();
  const session: PrintSession = {
    id: sessionId,
    created_at: new Date().toISOString(),
    filename: file.name,
    total_codes: codes.length,
    notes: `Imported on ${new Date().toLocaleString()}`
  };

  await db.print_sessions.add(session);

  const rows = codes.map(code => ({
    id: crypto.randomUUID(),
    session_id: sessionId,
    gtin: code.gtin,
    serial: code.serial,
    full_code: code.fullCode,
    product_name: code.productName,
    attributes: {},
    is_printed: false
  }));

  await db.print_codes.bulkAdd(rows);
  return session;
}

export async function getSessionsLocal(): Promise<PrintSession[]> {
  return await db.print_sessions.orderBy('created_at').reverse().toArray();
}

export async function getGtinGroupsLocal(sessionId: string) {
  const codes = await db.print_codes.where('session_id').equals(sessionId).toArray();
  
  const groups: Record<string, { 
    gtin: string, 
    productName: string, 
    total: number, 
    printed: number 
  }> = {};

  codes.forEach(row => {
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

export async function fetchCodesForPrintingLocal(sessionId: string, gtin: string, limit: number) {
  // Dexie doesn't support complex filtering with limit directly on index in one go easily for this specific query
  // But we can use compound index or filter in memory since dataset is local
  return await db.print_codes
    .where('session_id').equals(sessionId)
    .filter(code => code.gtin === gtin && !code.is_printed)
    .limit(limit)
    .toArray();
}

export async function markCodesAsPrintedLocal(ids: string[]) {
  await db.print_codes.bulkUpdate(ids.map(id => ({ 
    key: id, 
    changes: { is_printed: true, printed_at: new Date().toISOString() } 
  })));
}
