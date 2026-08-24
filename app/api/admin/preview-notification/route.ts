export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import type { NotificationType } from '@/lib/notifications';
import { setupExperienceHtml, setupExperienceSubject } from '@/lib/emails/setup-experience';
import { firstTailorHtml, firstTailorSubject } from '@/lib/emails/first-tailor';
import { addMoreExperienceHtml, addMoreExperienceSubject } from '@/lib/emails/add-more-experience';
import { jobHuntCheckinHtml, jobHuntCheckinSubject } from '@/lib/emails/job-hunt-checkin';
import { tryExtensionHtml, tryExtensionSubject } from '@/lib/emails/try-extension';
import { freeTierUpdateHtml, freeTierUpdateSubject } from '@/lib/emails/free-tier-update';

const PREVIEW_UNSUB = 'https://easy-apply.ai/unsubscribe?preview=true';

function buildPreview(type: NotificationType): { subject: string; html: string } {
  const name = 'Alex Johnson';
  switch (type) {
    case 'setup_experience':
      return { subject: setupExperienceSubject, html: setupExperienceHtml(name, PREVIEW_UNSUB) };
    case 'first_tailor':
      return { subject: firstTailorSubject, html: firstTailorHtml(name, PREVIEW_UNSUB) };
    case 'add_more_experience':
      return { subject: addMoreExperienceSubject, html: addMoreExperienceHtml(name, PREVIEW_UNSUB) };
    case 'job_hunt_checkin':
      return { subject: jobHuntCheckinSubject, html: jobHuntCheckinHtml(name, PREVIEW_UNSUB) };
    case 'try_extension':
      return { subject: tryExtensionSubject, html: tryExtensionHtml(name, PREVIEW_UNSUB) };
    case 'free_tier_update':
      return { subject: freeTierUpdateSubject, html: freeTierUpdateHtml(name, PREVIEW_UNSUB) };
  }
}

const VALID_TYPES: NotificationType[] = [
  'setup_experience', 'first_tailor', 'add_more_experience', 'job_hunt_checkin', 'try_extension', 'free_tier_update',
];

export async function GET(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const type = req.nextUrl.searchParams.get('type') as NotificationType | null;
  if (!type || !VALID_TYPES.includes(type)) {
    return new Response('Invalid type', { status: 400 });
  }

  return Response.json(buildPreview(type));
}
