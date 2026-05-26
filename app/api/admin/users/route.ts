export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const segment = searchParams.get('segment') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const limit = 50;
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();
  const now = new Date();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('users')
    .select('id, email, full_name, subscription_status, created_at, tailored_resume_count, do_not_email', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  switch (segment) {
    case 'new7d':
      query = query.gte('created_at', d7ago);
      break;
    case 'new30d':
      query = query.gte('created_at', d30ago);
      break;
    case 'pro':
      query = query.eq('subscription_status', 'pro');
      break;
    case 'canceled':
      query = query.eq('subscription_status', 'canceled');
      break;
    case 'free':
      query = query.or('subscription_status.eq.free,subscription_status.is.null');
      break;
  }

  const { data: users, count, error } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ users: users ?? [], total: count ?? 0, page, limit });
}
