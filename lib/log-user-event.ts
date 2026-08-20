import { supabaseServer } from '@/lib/supabase';
import type { Json } from '@/types/database';

/**
 * Fire-and-forget user event logger for product telemetry.
 * Writes to user_events table. Never throws or blocks the response.
 */
export function logUserEvent(
  userId: string | null | undefined,
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    const supabase = supabaseServer();
    void Promise.resolve(
      supabase.from('user_events').insert({
        user_id: userId ?? null,
        event,
        properties: (properties ?? null) as Json | null,
      })
    ).then(() => {}).catch((err: unknown) => console.error('[logUserEvent] insert failed:', err));
  } catch (err) {
    console.error('[logUserEvent] setup failed:', err);
  }
}
