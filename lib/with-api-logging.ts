import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { logApiCall } from '@/lib/log-api';

type Handler = (req: NextRequest, ctx?: unknown) => Promise<Response>;

/**
 * Wraps a route handler and logs every request to api_logs — successes and errors alike.
 * Success rows are lightweight (no request body). Error rows include the error message.
 * Fire-and-forget — never delays or alters the response.
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

    // Always log errors. For successes, only log state-changing methods (POST/PUT/PATCH/DELETE)
    // — GET successes are high-frequency reads (billing/status, me, resumes list) that would
    // flood the table with noise without adding meaningful user-journey visibility.
    const isError = res.status >= 400;
    const isMutation = req.method !== 'GET';
    if (isError || isMutation) {
      auth()
        .then(({ userId }) => {
          logApiCall({
            user_id: userId,
            route,
            method: req.method,
            status_code: res.status,
            error: isError ? `HTTP ${res.status}` : undefined,
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
