export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';
import { logUserEvent } from '@/lib/log-user-event';
import type { Json } from '@/types/database';

const FREE_ROLE_LIMIT = Number(process.env.FREE_INTERVIEW_ROLE_LIMIT ?? 2);

// PATCH /api/interview/sessions/[id] — update session state
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { status?: string; completed_roles?: unknown; draft_state?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const supabase = supabaseServer();

  // When completed_roles is updated, enforce the per-role free limit
  if (body.completed_roles !== undefined) {
    const [{ data: session }, { data: userData }] = await Promise.all([
      supabase
        .from('interview_sessions')
        .select('completed_roles')
        .eq('id', params.id)
        .eq('user_id', userId)
        .single(),
      supabase
        .from('users')
        .select('subscription_status, experience_interview_count')
        .eq('id', userId)
        .single(),
    ]);

    const isPro = userData?.subscription_status === 'pro';

    if (!isPro) {
      const prevRoleCount = Array.isArray(session?.completed_roles) ? session.completed_roles.length : 0;
      const newRoleCount = Array.isArray(body.completed_roles) ? body.completed_roles.length : 0;
      const newRolesAdded = Math.max(0, newRoleCount - prevRoleCount);
      const usedRoles = userData?.experience_interview_count ?? 0;

      if (newRolesAdded > 0 && usedRoles + newRolesAdded > FREE_ROLE_LIMIT) {
        logUserEvent(userId, 'experience_interview_locked_click', { usedRoles, limit: FREE_ROLE_LIMIT });
        return Response.json(
          { error: 'INTERVIEW_LIMIT_REACHED', upgradeUrl: '/pricing', usedRoles, limit: FREE_ROLE_LIMIT },
          { status: 402 }
        );
      }

      if (newRolesAdded > 0) {
        void supabase
          .from('users')
          .update({ experience_interview_count: usedRoles + newRolesAdded })
          .eq('id', userId)
          .then(({ error: updErr }) => {
            if (updErr) console.error('[interview/sessions PATCH] role count error:', updErr.message);
          });
      }
    }
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) update.status = body.status;
  if (body.completed_roles !== undefined) update.completed_roles = body.completed_roles as Json;
  if (body.draft_state !== undefined) update.draft_state = body.draft_state as Json;

  const { error } = await supabase
    .from('interview_sessions')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}

// DELETE /api/interview/sessions/[id] — delete a session
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const supabase = supabaseServer();
  const { error } = await supabase
    .from('interview_sessions')
    .delete()
    .eq('id', params.id)
    .eq('user_id', userId);

  if (error) return new Response(error.message, { status: 500 });
  return new Response(null, { status: 204 });
}
