export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { fetchAllUserStats, getEligibleNotifications, sendNotification } from '@/lib/notifications';

export async function GET(req: NextRequest) {
  // Vercel cron passes Authorization: Bearer <CRON_SECRET>
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[cron/notifications] RESEND_API_KEY is not set — no emails will be sent');
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const users = await fetchAllUserStats();
  console.log(`[cron/notifications] fetched ${users.length} eligible users`);
  const results: { userId: string; type: string; ok: boolean; error?: string }[] = [];

  for (const user of users) {
    const eligible = getEligibleNotifications(user);
    if (eligible.length === 0) continue;
    // Send only the first (highest-priority) eligible notification per user per run
    // to avoid sending multiple emails to the same person in a single day.
    // Remaining eligible types will be sent on subsequent daily runs.
    const type = eligible[0];
    const result = await sendNotification(user.id, type, user.email, user.full_name ?? user.email);
    results.push({ userId: user.id, type, ...result });
  }

  const sent = results.filter(r => r.ok).length;
  const skipped = results.filter(r => !r.ok && r.error === 'already_sent').length;
  const failed = results.filter(r => !r.ok && r.error !== 'already_sent').length;

  console.log(`[cron/notifications] users=${users.length} sent=${sent} skipped=${skipped} failed=${failed}`);
  if (failed > 0) {
    console.error('[cron/notifications] failures:', results.filter(r => !r.ok && r.error !== 'already_sent'));
  }

  return Response.json({ users: users.length, sent, skipped, failed, results });
}
