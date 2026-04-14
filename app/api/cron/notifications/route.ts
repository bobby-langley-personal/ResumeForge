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

  const users = await fetchAllUserStats();
  const results: { userId: string; type: string; ok: boolean; error?: string }[] = [];

  for (const user of users) {
    const eligible = getEligibleNotifications(user);
    for (const type of eligible) {
      const result = await sendNotification(user.id, type, user.email, user.full_name ?? user.email);
      results.push({ userId: user.id, type, ...result });
    }
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
