import { supabaseServer } from '@/lib/supabase';

export interface ApiLogEntry {
  user_id?: string | null;
  route: string;
  method?: string;
  status_code: number;
  request_body?: Record<string, unknown> | null;
  response_summary?: Record<string, unknown> | null;
  error?: string | null;
  duration_ms?: number | null;
}

/** Truncate long string values so we don't store huge payloads in JSONB. */
export function sanitizeBody(
  body: Record<string, unknown>,
  maxLen = 300
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'string' && v.length > maxLen) {
      out[k] = `[${v.length} chars]`;
    } else if (Array.isArray(v)) {
      out[k] = `[array(${v.length})]`;
    } else if (v !== null && typeof v === 'object') {
      out[k] = '[object]';
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * Fire-and-forget API call logger. Never throws or blocks the response.
 * Works in both Node and Edge runtimes.
 */
export function logApiCall(entry: ApiLogEntry): void {
  try {
    const supabase = supabaseServer();
    void Promise.resolve((supabase as unknown as { from: (t: string) => { insert: (v: unknown) => PromiseLike<unknown> } })
      .from('api_logs')
      .insert({
        user_id: entry.user_id ?? null,
        route: entry.route,
        method: entry.method ?? 'POST',
        status_code: entry.status_code,
        request_body: entry.request_body ?? null,
        response_summary: entry.response_summary ?? null,
        error: entry.error ?? null,
        duration_ms: entry.duration_ms ?? null,
        app_version: process.env.NEXT_PUBLIC_APP_VERSION ?? null,
      })
    ).then(() => {}).catch((err: unknown) => console.error('[logApiCall] insert failed:', err));
  } catch (err) {
    console.error('[logApiCall] setup failed:', err);
  }
}
