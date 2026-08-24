export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';
import { logUserEvent } from '@/lib/log-user-event';

const FREE_SESSION_LIMIT = Number(process.env.FREE_INTERVIEW_ROLE_LIMIT ?? 2);

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
// Gated: free users are limited to FREE_SESSION_LIMIT sessions (lifetime)
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

  // Gate: check free-tier session limit
  const { data: userData } = await supabase
    .from('users')
    .select('subscription_status, experience_interview_count')
    .eq('id', userId)
    .single();

  const isPro = userData?.subscription_status === 'pro';
  const interviewCount = userData?.experience_interview_count ?? 0;

  if (!isPro && interviewCount >= FREE_SESSION_LIMIT) {
    logUserEvent(userId, 'experience_interview_locked_click', { interviewCount });
    return Response.json(
      { error: 'INTERVIEW_LIMIT_REACHED', upgradeUrl: '/pricing' },
      { status: 402 }
    );
  }

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

  // Increment session counter for free users (fire-and-forget)
  if (!isPro) {
    void supabase
      .from('users')
      .update({ experience_interview_count: interviewCount + 1 })
      .eq('id', userId)
      .then(({ error: updErr }) => {
        if (updErr) console.error('[interview/sessions POST] count error:', updErr.message);
      });
  }

  return Response.json({ id: data.id }, { status: 201 });
}
