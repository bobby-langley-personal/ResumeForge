import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

// Browser client for client components (anon key, RLS applies)
export const supabaseBrowser = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server client for API routes — uses service role key to bypass RLS.
// Auth is enforced via Clerk's auth() before calling this; user_id is
// always filtered manually in each query.
export const supabaseServer = async () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY!,
    { auth: { persistSession: false } }
  );
};

// Default client (for compatibility)
export const supabaseClient = supabaseBrowser;