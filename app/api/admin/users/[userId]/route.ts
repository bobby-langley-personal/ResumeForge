export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { userId } = await params;
  const supabase = supabaseServer();

  const [userResult, profileResult, resumesResult, applicationsResult, logsResult] =
    await Promise.all([
      supabase
        .from('users')
        .select('id, email, full_name, subscription_status, subscription_period_end, created_at, tailored_resume_count, stripe_customer_id, do_not_email')
        .eq('id', userId)
        .single(),
      supabase
        .from('user_profiles')
        .select('full_name, email, location, linkedin_url')
        .eq('user_id', userId)
        .maybeSingle(),
      supabase
        .from('resumes')
        .select('id, title, item_type, is_default, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      supabase
        .from('applications')
        .select('id, company, job_title, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('api_logs')
        .select('id, route, method, status_code, request_body, response_summary, error, duration_ms, app_version, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

  if (!userResult.data) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  return Response.json({
    user: userResult.data,
    profile: profileResult.data ?? null,
    resumes: resumesResult.data ?? [],
    applications: {
      total: applicationsResult.count ?? 0,
      recent: applicationsResult.data ?? [],
    },
    logs: logsResult.data ?? [],
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { userId } = await params;
  let body: { do_not_email?: boolean };
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  if (typeof body.do_not_email !== 'boolean') {
    return new Response('do_not_email (boolean) required', { status: 400 });
  }

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('users')
    .update({ do_not_email: body.do_not_email })
    .eq('id', userId);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
