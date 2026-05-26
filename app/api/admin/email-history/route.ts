export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const type = searchParams.get('type') ?? '';
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();

  let query = supabase
    .from('user_notifications')
    .select('id, user_id, notification_type, sent_at', { count: 'exact' })
    .order('sent_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (type) query = query.eq('notification_type', type as 'setup_experience' | 'first_tailor' | 'add_more_experience' | 'job_hunt_checkin' | 'try_extension');

  const { data: rows, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with user info
  const userIds = Array.from(new Set((rows ?? []).map(r => r.user_id)));
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

  const enriched = (rows ?? []).map(r => ({
    ...r,
    user: usersMap[r.user_id] ?? null,
  }));

  return Response.json({ history: enriched, total: count ?? 0, page, limit });
}
