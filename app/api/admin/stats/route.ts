export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = supabaseServer();
  const now = new Date();
  const d7ago = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const d30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [usersResult, recentResult] = await Promise.all([
    supabase.from('users').select('id, email, full_name, created_at, subscription_status'),
    supabase
      .from('users')
      .select('id, email, full_name, created_at, subscription_status')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  const users = usersResult.data ?? [];
  const recentSignups = recentResult.data ?? [];

  const subscriptions = { free: 0, pro: 0, canceled: 0 };
  let newUsers7d = 0;
  let newUsers30d = 0;

  for (const u of users) {
    const status = (u.subscription_status ?? 'free') as 'free' | 'pro' | 'canceled';
    subscriptions[status] = (subscriptions[status] ?? 0) + 1;
    if (u.created_at >= d7ago) newUsers7d++;
    if (u.created_at >= d30ago) newUsers30d++;
  }

  // Most recent notification send
  const { data: lastNotif } = await supabase
    .from('user_notifications')
    .select('sent_at')
    .order('sent_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const resendConfigured = !!(process.env.RESEND_API_KEY);

  return Response.json({
    totalUsers: users.length,
    newUsers7d,
    newUsers30d,
    subscriptions,
    recentSignups,
    resendConfigured,
    lastNotificationSentAt: lastNotif?.sent_at ?? null,
  });
}
