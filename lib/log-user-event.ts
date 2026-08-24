import { supabaseServer } from '@/lib/supabase';
import type { Json } from '@/types/database';

/**
 * Fire-and-forget user product event logger.
 * Writes to the user_events table for admin visibility — never throws or blocks.
 * Use for gating events (cap hits, locked-feature clicks) and upgrade funnel tracking.
 *
 * Call from server-side code (API routes). For client-side events, POST to /api/log-event.
 */
export function logUserEvent(
  userId: string | null | undefined,
  event: string,
  properties?: Record<string, unknown>
): void {
  try {
    const supabase = supabaseServer();
    void Promise.resolve(
      supabase
        .from('user_events')
        .insert({
          user_id: userId ?? null,
          event,
          properties: (properties ?? null) as Json | null,
        })
    ).then(() => {}).catch((err: unknown) => console.error('[logUserEvent] insert failed:', err));
  } catch (err) {
    console.error('[logUserEvent] setup failed:', err);
  }
}
