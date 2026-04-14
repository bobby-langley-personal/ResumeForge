export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import { sendNotification, getEligibleNotifications, fetchAllUserStats, type NotificationType } from '@/lib/notifications';

const VALID_TYPES: NotificationType[] = [
  'setup_experience',
  'first_tailor',
  'add_more_experience',
  'job_hunt_checkin',
  'try_extension',
];

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { userIds?: string[]; notificationType?: string; force?: boolean };
  try { body = await req.json(); } catch { return new Response('Invalid JSON', { status: 400 }); }

  const { userIds, notificationType, force = false } = body;
  if (!userIds?.length) return new Response('userIds required', { status: 400 });
  if (!notificationType || !VALID_TYPES.includes(notificationType as NotificationType)) {
    return new Response(`notificationType must be one of: ${VALID_TYPES.join(', ')}`, { status: 400 });
  }

  const type = notificationType as NotificationType;
  const supabase = supabaseServer();

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name')
    .in('id', userIds);

  if (error || !users) return new Response('Failed to fetch users', { status: 500 });

  const results = await Promise.all(
    users.map(u => sendNotification(u.id, type, u.email, u.full_name ?? u.email, force)
      .then(r => ({ userId: u.id, email: u.email, ...r }))
    )
  );

  return Response.json({ results });
}

// GET — returns all users with their notification eligibility state (for the admin UI)
export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const users = await fetchAllUserStats();
  const withEligibility = users.map(u => ({
    ...u,
    eligible: getEligibleNotifications(u),
  }));

  return Response.json({ users: withEligibility });
}
