import { createClient } from '@supabase/supabase-js';

// Hardcoded for deployment fix as requested
const supabaseUrl = "https://mtvpselwqpxbptipwjqe.supabase.co";
const supabaseAnonKey = "sb_publishable_DKDCX1ah8h9IM1TO7XGhKg_CeR60BEn";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
