import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let supabase: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
} else {
  console.warn('Supabase URL or Anon Key is missing. Running in local mode (IndexedDB).');
}

export { supabase };

export type PrintSession = {
  id: string;
  created_at: string;
  filename: string;
  total_codes: number;
  notes?: string;
};

export type PrintCode = {
  id: string;
  session_id: string;
  gtin: string;
  serial: string;
  full_code: string;
  product_name?: string;
  attributes?: {
    size?: string;
    color?: string;
    composition?: string;
    [key: string]: any;
  };
  is_printed: boolean;
  printed_at?: string;
};
