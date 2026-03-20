import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

// PATCH /api/resumes/[id]/default — set as default (clears others)
export async function PATCH(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const supabase = await supabaseServer();

  // Verify ownership
  const { data: item } = await supabase
    .from('resumes')
    .select('user_id')
    .eq('id', id)
    .single();
  if (!item || item.user_id !== userId) return new Response('Not found', { status: 404 });

  // Clear existing default
  await supabase
    .from('resumes')
    .update({ is_default: false })
    .eq('user_id', userId)
    .eq('is_default', true);

  // Set new default
  const { data, error } = await supabase
    .from('resumes')
    .update({ is_default: true })
    .eq('id', id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}
