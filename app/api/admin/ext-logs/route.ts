import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const severity = searchParams.get('severity') ?? '';
  const platform = searchParams.get('platform') ?? '';
  const event = searchParams.get('event') ?? '';
  const days = Math.min(90, Math.max(1, parseInt(searchParams.get('days') ?? '30', 10)));
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100'), 200);

  const supabase = supabaseServer();
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Filters before order/limit
  let query = supabase
    .from('ext_logs')
    .select('id, user_id, event, platform, method, severity, payload, ext_version, created_at')
    .gte('created_at', since);

  if (severity) query = query.eq('severity', severity);
  if (platform) query = query.eq('platform', platform);
  if (event) query = query.eq('event', event);

  const { data: logs, error } = await query
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Enrich with user profiles
  const userIds = Array.from(new Set((logs ?? []).map(l => l.user_id).filter(Boolean))) as string[];
  let profiles: Record<string, { full_name: string | null; email: string | null }> = {};

  if (userIds.length > 0) {
    const { data: profileRows } = await supabase
      .from('user_profiles')
      .select('user_id, full_name, email')
      .in('user_id', userIds);
    for (const p of profileRows ?? []) {
      profiles[p.user_id] = { full_name: p.full_name, email: p.email };
    }
  }

  const enriched = (logs ?? []).map(log => ({
    ...log,
    user: log.user_id ? (profiles[log.user_id] ?? null) : null,
  }));

  return Response.json({ logs: enriched });
}
