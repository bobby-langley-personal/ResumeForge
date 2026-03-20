import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Browser client for client components (anon key, RLS applies)
export const supabaseBrowser = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Module-level singleton for the service role client.
// Creating a new Supabase client per request was causing connection exhaustion
// on the free tier, leading to 30-70s cold reconnects.
let _serverClient: SupabaseClient<Database> | null = null;

export const supabaseServer = (): SupabaseClient<Database> => {
  if (_serverClient) return _serverClient;
  _serverClient = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
  return _serverClient;
};

// Default client (for compatibility)
export const supabaseClient = supabaseBrowser;
