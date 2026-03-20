import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// DELETE /api/applications — bulk delete by ids
export async function DELETE(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { ids } = await req.json();
  if (!Array.isArray(ids) || ids.length === 0) {
    return new Response('ids array required', { status: 400 });
  }

  const supabase = await supabaseServer();
  const { error } = await supabase
    .from('applications')
    .delete()
    .in('id', ids)
    .eq('user_id', userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
