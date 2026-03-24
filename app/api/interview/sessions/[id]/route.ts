export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';
import type { Json } from '@/types/database';

// PATCH /api/interview/sessions/[id] — update session state
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { status?: string; completed_roles?: unknown; draft_state?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = supabaseServer();
  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.completed_roles !== undefined) update.completed_roles = body.completed_roles as Json;
  if (body.draft_state !== undefined) update.draft_state = body.draft_state as Json;

  const { error } = await supabase
    .from('interview_sessions')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', userId); // ensure ownership

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}

// DELETE /api/interview/sessions/[id] — delete a session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('interview_sessions')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
