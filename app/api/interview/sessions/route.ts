export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

// GET /api/interview/sessions — fetch the most recent draft session
export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('interview_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'draft')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ session: data });
}

// POST /api/interview/sessions — create a new draft session
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { completed_roles?: unknown; draft_state?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('interview_sessions')
    .insert({
      user_id: userId,
      status: 'draft',
      completed_roles: (body.completed_roles ?? []) as import('@/types/database').Json,
      draft_state: (body.draft_state ?? null) as import('@/types/database').Json | null,
    })
    .select('id')
    .single();

  if (error) return new Response(error.message, { status: 500 });
  return Response.json({ id: data.id }, { status: 201 });
}
