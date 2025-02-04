import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    // Disable WebSocket transport for browser compatibility
    fetch: (...args) => fetch(...args),
    WebSocket: false,
  },
  db: {
    schema: 'public',
  },
  auth: {
    persistSession: true,
    autoRefreshToken: true
  }
});
