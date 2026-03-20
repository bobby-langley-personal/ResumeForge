import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

async function getOwned(userId: string, id: string) {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from('resumes')
    .select('id, user_id')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  if (data.user_id !== userId) return null;
  return supabase;
}

// PUT /api/resumes/[id] — update title, content, or item_type
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const supabase = await getOwned(userId, id);
  if (!supabase) return new Response('Not found', { status: 404 });

  const { title, content, item_type } = await req.json();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (title !== undefined) updates.title = title;
  if (content !== undefined) updates.content = content;
  if (item_type !== undefined) updates.item_type = item_type;

  const { data, error } = await supabase
    .from('resumes')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json(data);
}

// DELETE /api/resumes/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;

  const supabase = await getOwned(userId, id);
  if (!supabase) return new Response('Not found', { status: 404 });

  const { error } = await supabase.from('resumes').delete().eq('id', id);
  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
