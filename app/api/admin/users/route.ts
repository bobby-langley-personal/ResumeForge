export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const VALID_SORT_COLS = ['created_at', 'last_sign_in_at', 'full_name', 'email', 'subscription_status'] as const;
type SortCol = typeof VALID_SORT_COLS[number];

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const segment = searchParams.get('segment') ?? 'all';
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const sortBy = (VALID_SORT_COLS.includes(searchParams.get('sortBy') as SortCol)
    ? searchParams.get('sortBy')
    : 'created_at') as SortCol;
  const sortAsc = searchParams.get('sortDir') === 'asc';
  // For live-count columns (resume_count, doc_count) sorting is done client-side
  const limit = 200; // fetch all for client-side sort on count columns
  const offset = (page - 1) * limit;

  const supabase = supabaseServer();
  const now = new Date();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('users')
    .select(
      'id, email, full_name, subscription_status, created_at, last_sign_in_at, do_not_email, applications(count), resumes(count)',
      { count: 'exact' },
    );

  switch (segment) {
    case 'new7d':    query = query.gte('created_at', d7ago); break;
    case 'new30d':   query = query.gte('created_at', d30ago); break;
    case 'pro':      query = query.eq('subscription_status', 'pro'); break;
    case 'canceled': query = query.eq('subscription_status', 'canceled'); break;
    case 'free':     query = query.or('subscription_status.eq.free,subscription_status.is.null'); break;
  }

  const { data, count, error } = await query
    .order(sortBy, { ascending: sortAsc, nullsFirst: false })
    .range(offset, offset + limit - 1);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  // Reshape: flatten the embedded counts into flat fields
  const users = (data ?? []).map(u => {
    const row = u as Record<string, unknown> & {
      applications: { count: number }[];
      resumes: { count: number }[];
    };
    const { applications, resumes, ...rest } = row;
    return {
      ...rest,
      resume_count: applications?.[0]?.count ?? 0,
      doc_count: resumes?.[0]?.count ?? 0,
    };
  });

  return Response.json({ users, total: count ?? 0, page, limit });
}
