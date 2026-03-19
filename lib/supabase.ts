import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

// Browser client for client components
export const supabaseBrowser = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
};

// Server client for server components and API routes  
export const supabaseServer = async () => {
  const cookieStore = await cookies();
  
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${cookieStore.get('sb-access-token')?.value || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
        },
      },
    }
  );
};

// Default client (for compatibility)
export const supabaseClient = supabaseBrowser;