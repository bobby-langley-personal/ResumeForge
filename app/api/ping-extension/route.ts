export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

export async function POST() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const supabase = supabaseServer();
  await supabase
    .from('users')
    .update({ has_used_extension: true })
    .eq('id', userId)
    .eq('has_used_extension', false); // no-op if already true

  return new Response(null, { status: 204 });
}
