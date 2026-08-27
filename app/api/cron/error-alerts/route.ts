export const runtime = 'nodejs';
export const maxDuration = 30;

import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';
import { logApiCall } from '@/lib/log-api';

const CRON_NAME = 'error_alerts';
const DEFAULT_THRESHOLD = 3;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? 'Easy Apply AI <hello@easy-apply.ai>';
  const threshold = Number(process.env.ERROR_ALERT_THRESHOLD ?? DEFAULT_THRESHOLD);

  const supabase = supabaseServer();
  const now = new Date();

  // Get last run time so we only check errors since the previous run
  const { data: lastRun } = await supabase
    .from('cron_runs')
    .select('finished_at')
    .eq('name', CRON_NAME)
    .maybeSingle();

  // Use 35 min fallback (slightly over the 30-min interval) so no window is missed on first run
  const since = lastRun?.finished_at
    ? new Date(lastRun.finished_at).toISOString()
    : new Date(now.getTime() - 35 * 60 * 1000).toISOString();

  // Fetch 5xx errors in the window (cap at 100 rows — if there are more, something is seriously wrong)
  const { data: fivexxRows } = await supabase
    .from('api_logs')
    .select('route, error, status_code, created_at')
    .gte('created_at', since)
    .gte('status_code', 500)
    .order('created_at', { ascending: false })
    .limit(100);

  // Count 4xx errors (informational only — not an alert trigger)
  const { count: fourxxCount } = await supabase
    .from('api_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
    .gte('status_code', 400)
    .lt('status_code', 500);

  const fivexxCount = fivexxRows?.length ?? 0;

  console.log(
    `[cron/error-alerts] window: ${since} → ${now.toISOString()} | ` +
    `5xx: ${fivexxCount} | 4xx: ${fourxxCount ?? 0} | threshold: ${threshold}`
  );

  let emailSent = false;

  if (fivexxCount >= threshold) {
    if (!resendKey || !adminEmail) {
      console.error('[cron/error-alerts] Threshold met but RESEND_API_KEY or ADMIN_NOTIFICATION_EMAIL is not set');
    } else {
      // Group by route, sorted by count descending
      const byRoute: Record<string, { count: number; sampleError: string | null }> = {};
      for (const row of fivexxRows ?? []) {
        const key = row.route ?? 'unknown';
        if (!byRoute[key]) byRoute[key] = { count: 0, sampleError: row.error ?? null };
        byRoute[key].count++;
      }

      const tableRows = Object.entries(byRoute)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([route, { count, sampleError }]) => `
          <tr>
            <td style="padding:8px 12px;font-family:monospace;font-size:12px;color:#f87171;">${route.replace('/api/', '')}</td>
            <td style="padding:8px 12px;text-align:center;font-weight:600;color:#fca5a5;">${count}</td>
            <td style="padding:8px 12px;font-size:11px;color:#9ca3af;max-width:280px;word-break:break-all;">${sampleError ? sampleError.slice(0, 120) : '—'}</td>
          </tr>`)
        .join('');

      const fmt = (d: Date) =>
        d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' }) + ' UTC';

      const resend = new Resend(resendKey);
      const { error: sendError } = await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `⚠️ Easy Apply — ${fivexxCount} API error${fivexxCount === 1 ? '' : 's'} (${fmt(new Date(since))} – ${fmt(now)})`,
        html: `
          <div style="font-family:sans-serif;max-width:580px;margin:40px auto;padding:32px;background:#111;border:1px solid #222;border-radius:12px;color:#e5e7eb;">
            <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Easy Apply Admin</p>
            <h2 style="margin:0 0 4px;font-size:18px;font-weight:600;color:#f9fafb;">&#9888;&#65039; ${fivexxCount} server error${fivexxCount === 1 ? '' : 's'} detected</h2>
            <p style="margin:0 0 24px;font-size:12px;color:#6b7280;">${fmt(new Date(since))} &rarr; ${fmt(now)}</p>

            <table style="width:100%;border-collapse:collapse;background:#1a1a1a;border-radius:8px;overflow:hidden;margin-bottom:20px;">
              <thead>
                <tr style="background:#222;">
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Route</th>
                  <th style="padding:8px 12px;text-align:center;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Count</th>
                  <th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;">Sample error</th>
                </tr>
              </thead>
              <tbody>${tableRows}</tbody>
            </table>

            ${(fourxxCount ?? 0) > 0
              ? `<p style="margin:0 0 20px;font-size:12px;color:#6b7280;">Also in this window: <strong style="color:#9ca3af;">${fourxxCount} client error${fourxxCount === 1 ? '' : 's'} (4xx)</strong></p>`
              : ''}

            <a href="https://easy-apply.ai/admin/logs" style="display:inline-block;padding:10px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-size:13px;font-weight:500;">View in Admin Logs &rarr;</a>
          </div>
        `,
      });

      if (sendError) {
        console.error('[cron/error-alerts] Email send failed:', sendError.message);
      } else {
        emailSent = true;
        console.log(`[cron/error-alerts] Alert sent — ${fivexxCount} errors across ${Object.keys(byRoute).length} route(s)`);
      }
    }
  } else if (fivexxCount > 0) {
    console.log(`[cron/error-alerts] ${fivexxCount} error(s) found but below threshold of ${threshold} — no alert`);
  } else {
    console.log('[cron/error-alerts] No errors in window — all clear');
  }

  // Update cron_runs so the next run knows where to start
  await supabase.from('cron_runs').upsert(
    {
      name: CRON_NAME,
      status: 'succeeded',
      started_at: now.toISOString(),
      finished_at: now.toISOString(),
      sent_count: fivexxCount,
    },
    { onConflict: 'name' }
  );

  // Log to api_logs so alert runs are visible in the admin logs page
  logApiCall({
    route: '/cron/error-alerts',
    method: 'GET',
    status_code: 200,
    response_summary: {
      fivexxCount,
      fourxxCount: fourxxCount ?? 0,
      emailSent,
      threshold,
      windowStart: since,
    },
  });

  return Response.json({
    fivexxCount,
    fourxxCount: fourxxCount ?? 0,
    emailSent,
    threshold,
    since,
    now: now.toISOString(),
  });
}
