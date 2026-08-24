export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { fetchAllUserStats, getEligibleNotifications, sendNotification, MIN_DAYS_BETWEEN_EMAILS } from '@/lib/notifications';
import { supabaseServer } from '@/lib/supabase';

const CRON_NAME = 'notifications';
// Caps how many emails one automated run can send, so a large backlog (e.g. after the
// cron was broken for a while) drains gradually across several daily runs instead of
// hitting everyone in one window. Tune via env var if needed.
const MAX_EMAILS_PER_RUN = Number(process.env.NOTIFICATIONS_MAX_PER_RUN ?? 25);
// If a previous run's row is still marked "running" after this long, treat it as
// crashed/timed-out rather than a live overlapping run, so a bad run can't wedge
// the cron forever.
const STALE_RUN_MINUTES = 10;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[cron/notifications] RESEND_API_KEY is not set — no emails will be sent');
    return Response.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
  }

  const supabase = supabaseServer();

  // Overlap guard.
  const { data: existingRun } = await supabase
    .from('cron_runs')
    .select('status, started_at')
    .eq('name', CRON_NAME)
    .maybeSingle();

  if (existingRun?.status === 'running' && existingRun.started_at) {
    const ageMinutes = (Date.now() - new Date(existingRun.started_at).getTime()) / 60000;
    if (ageMinutes < STALE_RUN_MINUTES) {
      console.log(`[cron/notifications] previous run still in progress (${ageMinutes.toFixed(1)}m old) — skipping`);
      return Response.json({ skipped: true, reason: 'already_running' });
    }
    console.warn(`[cron/notifications] previous run marked running but stale (${ageMinutes.toFixed(1)}m old) — proceeding`);
  }

  const startedAt = new Date().toISOString();
  await supabase.from('cron_runs').upsert(
    { name: CRON_NAME, status: 'running', started_at: startedAt, finished_at: null, sent_count: null },
    { onConflict: 'name' }
  );

  const users = await fetchAllUserStats();
  console.log(`[cron/notifications] fetched ${users.length} eligible users`);
  const results: { userId: string; type: string; ok: boolean; error?: string }[] = [];
  let capped = false;

  for (const user of users) {
    if (results.filter(r => r.ok).length >= MAX_EMAILS_PER_RUN) {
      capped = true;
      console.log(`[cron/notifications] hit per-run cap of ${MAX_EMAILS_PER_RUN} — remaining users will be picked up on a future run`);
      break;
    }
    const eligible = getEligibleNotifications(user);
    if (eligible.length === 0) continue;
    // Enforce a minimum gap between any two emails to the same user.
    if (user.last_notified_at) {
      const daysSince = (Date.now() - new Date(user.last_notified_at).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < MIN_DAYS_BETWEEN_EMAILS) continue;
    }
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

  console.log(`[cron/notifications] users=${users.length} sent=${sent} skipped=${skipped} failed=${failed} capped=${capped}`);
  if (failed > 0) {
    console.error('[cron/notifications] failures:', results.filter(r => !r.ok && r.error !== 'already_sent'));
  }

  await supabase.from('cron_runs').upsert(
    {
      name: CRON_NAME,
      status: failed > 0 && sent === 0 ? 'failed' : 'succeeded',
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      sent_count: sent,
    },
    { onConflict: 'name' }
  );

  return Response.json({ users: users.length, sent, skipped, failed, capped, results });
}
