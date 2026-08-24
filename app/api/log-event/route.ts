import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { logUserEvent } from '@/lib/log-user-event';
import type { Json } from '@/types/database';

export const runtime = 'nodejs';

function deriveSeverity(event: string, payload: Record<string, unknown>): 'info' | 'warning' | 'error' {
  if (event === 'scrape_quality') {
    const { hasDescription, descriptionLength, hasTitle, hasCompany } = payload as Record<string, unknown>;
    if (!hasDescription || (descriptionLength as number) < 100) return 'error';
    if (!hasTitle || !hasCompany || (descriptionLength as number) < 300) return 'warning';
    return 'info';
  }
  // Default severity by event name convention
  if (event.includes('error') || event.includes('fail')) return 'error';
  if (event.includes('warn') || event.includes('abandon')) return 'warning';
  return 'info';
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    // ignore parse errors
  }

  const { event, platform, method, ...rest } = body;
  const extVersion = req.headers.get('x-extension-version') ?? undefined;
  const severity = deriveSeverity(String(event ?? ''), body);

  // Write to console for Vercel function log searchability
  console.log('[analytics]', JSON.stringify({ userId, ...body, ext_version: extVersion, severity, ts: new Date().toISOString() }));

  // Always persist to user_events for admin product visibility
  logUserEvent(userId, String(event ?? 'unknown'), { ...rest, ext_version: extVersion });

  // Persist to ext_logs only for extension-originated events
  if (extVersion) {
    try {
      const supabase = supabaseServer();
      await supabase.from('ext_logs').insert({
        user_id: userId ?? undefined,
        event: String(event ?? 'unknown'),
        platform: platform ? String(platform) : undefined,
        method: method ? String(method) : undefined,
        severity,
        payload: rest as Json,
        ext_version: extVersion ?? undefined,
      });
    } catch (err) {
      console.error('[log-event] ext_logs insert failed:', err);
    }
  }

  return NextResponse.json({ ok: true });
}
