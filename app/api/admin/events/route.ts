export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const FRUSTRATION_EVENTS = [
  'chat_locked_clicked',
  'interview_prep_locked_clicked',
  'experience_interview_locked_clicked',
  'weekly_resume_cap_hit',
  'chat_limit_reached',
  'interview_prep_limit_reached',
  'experience_interview_limit_reached',
];

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? '';
  const event = searchParams.get('event') ?? '';
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)));
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Recent events (paginated) — filters must come before order/range
  let query = supabase
    .from('user_events')
    .select('*', { count: 'exact' })
    .gte('created_at', since);

  if (userId) query = query.eq('user_id', userId);
  if (event) query = query.eq('event', event);

  const { data: events, count, error } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with user info
  const userIds = Array.from(new Set((events ?? []).map(e => e.user_id).filter(Boolean))) as string[];
  let usersMap: Record<string, { email: string; full_name: string | null }> = {};
  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('id, email, full_name')
      .in('id', userIds);
    for (const u of users ?? []) {
      usersMap[u.id] = { email: u.email, full_name: u.full_name };
    }
  }

  const enriched = (events ?? []).map(e => ({
    ...e,
    user: e.user_id ? (usersMap[e.user_id] ?? null) : null,
  }));

  // Aggregate counts per event type in the window
  const { data: aggRows } = await supabase
    .from('user_events')
    .select('event')
    .gte('created_at', since);

  const counts: Record<string, number> = {};
  for (const row of aggRows ?? []) {
    counts[row.event] = (counts[row.event] ?? 0) + 1;
  }
  const aggregates = Object.entries(counts)
    .map(([name, count]) => ({ event: name, count, isFrustration: FRUSTRATION_EVENTS.includes(name) }))
    .sort((a, b) => b.count - a.count);

  return Response.json({
    events: enriched,
    total: count ?? 0,
    page,
    limit,
    aggregates,
    days,
  });
}
