export const runtime = 'nodejs';
export const maxDuration = 60;

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';

const RETENTION_DAYS = 90;

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const supabase = supabaseServer();
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const [apiResult, extResult, eventsResult] = await Promise.all([
    supabase.from('api_logs').delete().lt('created_at', cutoff),
    supabase.from('ext_logs').delete().lt('created_at', cutoff),
    supabase.from('user_events').delete().lt('created_at', cutoff),
  ]);

  const errors = [apiResult.error, extResult.error, eventsResult.error].filter(Boolean);
  if (errors.length > 0) {
    console.error('[cleanup-logs] errors:', errors.map(e => e!.message));
    return Response.json({ ok: false, errors: errors.map(e => e!.message) }, { status: 500 });
  }

  console.log(`[cleanup-logs] deleted rows older than ${RETENTION_DAYS} days (cutoff: ${cutoff})`);
  return Response.json({ ok: true, cutoff, tables: ['api_logs', 'ext_logs', 'user_events'] });
}
