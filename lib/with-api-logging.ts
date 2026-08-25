import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logApiCall } from '@/lib/log-api';

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

/**
 * Wraps a route handler and automatically logs any 4xx/5xx response (or uncaught throw)
 * to api_logs. Fire-and-forget — never delays or alters the response.
 */
export function withApiLogging(route: string, handler: Handler): Handler {
  return async (req: NextRequest, ctx?: unknown) => {
    const start = Date.now();
    let res: Response;

    try {
      res = await handler(req, ctx);
    } catch (err) {
      // Uncaught throw → treat as 500
      const { userId } = await auth().catch(() => ({ userId: null }));
      logApiCall({
        user_id: userId,
        route,
        method: req.method,
        status_code: 500,
        error: err instanceof Error ? err.message : String(err),
        duration_ms: Date.now() - start,
      });
      // Re-throw so Next.js surfaces the error normally
      throw err;
    }

    if (res.status >= 400) {
      // Log errors — fire-and-forget, don't await
      auth()
        .then(({ userId }) => {
          logApiCall({
            user_id: userId,
            route,
            method: req.method,
            status_code: res.status,
            duration_ms: Date.now() - start,
          });
        })
        .catch(() => {
          logApiCall({
            route,
            method: req.method,
            status_code: res.status,
            duration_ms: Date.now() - start,
          });
        });
    }

    return res;
  };
}
