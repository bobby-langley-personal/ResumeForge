import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';
import { setupExperienceHtml, setupExperienceSubject } from '@/lib/emails/setup-experience';
import { firstTailorHtml, firstTailorSubject } from '@/lib/emails/first-tailor';
import { addMoreExperienceHtml, addMoreExperienceSubject } from '@/lib/emails/add-more-experience';
import { jobHuntCheckinHtml, jobHuntCheckinSubject } from '@/lib/emails/job-hunt-checkin';
import { tryExtensionHtml, tryExtensionSubject } from '@/lib/emails/try-extension';
import { unsubscribeUrl } from '@/lib/unsubscribe-token';

export type NotificationType =
  | 'setup_experience'
  | 'first_tailor'
  | 'add_more_experience'
  | 'job_hunt_checkin'
  | 'try_extension';

export interface UserStats {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  doc_count: number;
  tailor_count: number;
  last_tailor_at: string | null;
  has_used_extension: boolean;
  email_unsubscribed: boolean;
  sent_notifications: NotificationType[];
}

const MS = {
  h24: 24 * 60 * 60 * 1000,
  h48: 48 * 60 * 60 * 1000,
  d3: 3 * 24 * 60 * 60 * 1000,
  d7: 7 * 24 * 60 * 60 * 1000,
  d14: 14 * 24 * 60 * 60 * 1000,
};

/**
 * Pure function — returns which notification types this user is due for.
 * Does NOT check sent_notifications (caller handles dedup via DB constraint).
 */
export function getEligibleNotifications(user: UserStats, now = Date.now()): NotificationType[] {
  const age = now - new Date(user.created_at).getTime();
  const lastActivity = user.last_tailor_at ? now - new Date(user.last_tailor_at).getTime() : null;
  const eligible: NotificationType[] = [];

  // Already sent — skip
  const sent = new Set(user.sent_notifications);

  if (!sent.has('setup_experience') && user.doc_count === 0 && age > MS.h24) {
    eligible.push('setup_experience');
  }

  if (!sent.has('first_tailor') && user.doc_count > 0 && user.tailor_count === 0 && age > MS.h48) {
    eligible.push('first_tailor');
  }

  if (!sent.has('add_more_experience') && user.doc_count === 1 && user.tailor_count >= 1 && age > MS.d7) {
    eligible.push('add_more_experience');
  }

  if (!sent.has('job_hunt_checkin') && user.tailor_count >= 1 && lastActivity !== null && lastActivity > MS.d14) {
    eligible.push('job_hunt_checkin');
  }

  if (!sent.has('try_extension') && !user.has_used_extension && age > MS.d3) {
    eligible.push('try_extension');
  }

  return eligible;
}

function buildEmail(type: NotificationType, name: string, userId: string): { subject: string; html: string } {
  const unsub = unsubscribeUrl(userId);
  switch (type) {
    case 'setup_experience':    return { subject: setupExperienceSubject, html: setupExperienceHtml(name, unsub) };
    case 'first_tailor':        return { subject: firstTailorSubject, html: firstTailorHtml(name, unsub) };
    case 'add_more_experience': return { subject: addMoreExperienceSubject, html: addMoreExperienceHtml(name, unsub) };
    case 'job_hunt_checkin':    return { subject: jobHuntCheckinSubject, html: jobHuntCheckinHtml(name, unsub) };
    case 'try_extension':       return { subject: tryExtensionSubject, html: tryExtensionHtml(name, unsub) };
  }
}

/**
 * Send a single notification to a user and record it in user_notifications.
 * Returns true on success, false on failure.
 */
export async function sendNotification(
  userId: string,
  type: NotificationType,
  email: string,
  name: string,
  force = false,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = supabaseServer();

  // Guard against duplicates (unless force mode for testing)
  if (!force) {
    const { data: existing } = await supabase
      .from('user_notifications')
      .select('id')
      .eq('user_id', userId)
      .eq('notification_type', type)
      .maybeSingle();
    if (existing) return { ok: false, error: 'already_sent' };
  }

  const resendKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? 'Easy Apply AI <hello@easy-apply.ai>';
  if (!resendKey) return { ok: false, error: 'RESEND_API_KEY not set' };

  const resend = new Resend(resendKey);
  const { subject, html } = buildEmail(type, name, userId);
  const unsub = unsubscribeUrl(userId);

  const { error: sendError } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject,
    html,
    headers: {
      'List-Unsubscribe': `<${unsub}>`,
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  });
  if (sendError) return { ok: false, error: sendError.message };

  // Record the send (ignore unique constraint violation — race condition is fine)
  await supabase.from('user_notifications').upsert(
    { user_id: userId, notification_type: type },
    { onConflict: 'user_id,notification_type', ignoreDuplicates: true }
  );

  return { ok: true };
}

/**
 * Fetch all users with their stats for the cron job.
 */
export async function fetchAllUserStats(): Promise<UserStats[]> {
  const supabase = supabaseServer();

  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, created_at, has_used_extension, email_unsubscribed')
    .eq('email_unsubscribed', false);
  if (error || !users) return [];

  const userIds = users.map(u => u.id);

  // Doc counts
  const { data: docCounts } = await supabase
    .from('resumes')
    .select('user_id')
    .in('user_id', userIds);

  // Tailor counts + last activity
  const { data: tailors } = await supabase
    .from('applications')
    .select('user_id, created_at')
    .in('user_id', userIds)
    .order('created_at', { ascending: false });

  // Sent notifications
  const { data: sentRows } = await supabase
    .from('user_notifications')
    .select('user_id, notification_type')
    .in('user_id', userIds);

  const docsByUser = new Map<string, number>();
  for (const r of docCounts ?? []) {
    docsByUser.set(r.user_id, (docsByUser.get(r.user_id) ?? 0) + 1);
  }

  const tailorCountByUser = new Map<string, number>();
  const lastTailorByUser = new Map<string, string>();
  for (const r of tailors ?? []) {
    tailorCountByUser.set(r.user_id, (tailorCountByUser.get(r.user_id) ?? 0) + 1);
    if (!lastTailorByUser.has(r.user_id)) lastTailorByUser.set(r.user_id, r.created_at);
  }

  const sentByUser = new Map<string, NotificationType[]>();
  for (const r of sentRows ?? []) {
    const arr = sentByUser.get(r.user_id) ?? [];
    arr.push(r.notification_type as NotificationType);
    sentByUser.set(r.user_id, arr);
  }

  return users.map(u => ({
    id: u.id,
    email: u.email,
    full_name: u.full_name,
    created_at: u.created_at,
    doc_count: docsByUser.get(u.id) ?? 0,
    tailor_count: tailorCountByUser.get(u.id) ?? 0,
    last_tailor_at: lastTailorByUser.get(u.id) ?? null,
    has_used_extension: u.has_used_extension ?? false,
    email_unsubscribed: u.email_unsubscribed ?? false,
    sent_notifications: sentByUser.get(u.id) ?? [],
  }));
}
