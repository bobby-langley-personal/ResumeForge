export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { fetchAllUserStats, getEligibleNotifications, sendNotification } from '@/lib/notifications';

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const users = await fetchAllUserStats();
  const results: { userId: string; email: string; type: string; ok: boolean; error?: string }[] = [];

  for (const user of users) {
    const eligible = getEligibleNotifications(user);
    if (eligible.length === 0) continue;
    // Max 1 email per user per run — stagger multiple eligible types across days
    const type = eligible[0];
    const result = await sendNotification(user.id, type, user.email, user.full_name ?? user.email);
    results.push({ userId: user.id, email: user.email, type, ...result });
  }

  const sent = results.filter(r => r.ok).length;
  const skipped = results.filter(r => !r.ok && r.error === 'already_sent').length;
  const failed = results.filter(r => !r.ok && r.error !== 'already_sent').length;

  console.log(`[admin/trigger-notifications] users=${users.length} sent=${sent} skipped=${skipped} failed=${failed}`);

  return Response.json({ users: users.length, sent, skipped, failed, results });
}
