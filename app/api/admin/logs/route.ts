export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId') ?? '';
  const route = searchParams.get('route') ?? '';
  const hasError = searchParams.get('hasError');
  const source = searchParams.get('source') ?? '';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();

  let query = supabase
    .from('api_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (userId) query = query.eq('user_id', userId);
  if (route) query = query.ilike('route', `%${route}%`);
  if (hasError === 'true') query = query.not('error', 'is', null);
  if (hasError === 'false') query = query.is('error', null);
  if (source) query = query.eq('source', source);

  const { data: logs, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich logs with user info
  const userIds = Array.from(new Set((logs ?? []).map(l => l.user_id).filter(Boolean))) as string[];
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

  const enriched = (logs ?? []).map(log => ({
    ...log,
    user: log.user_id ? (usersMap[log.user_id] ?? null) : null,
  }));

  return Response.json({ logs: enriched, total: count ?? 0, page, limit });
}
