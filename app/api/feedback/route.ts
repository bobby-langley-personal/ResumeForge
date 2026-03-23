export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { Resend } from 'resend';
import { supabaseServer } from '@/lib/supabase';

// Simple in-memory rate limit: max 3 submissions per IP per hour
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return false;
  }
  if (entry.count >= 3) return true;
  entry.count++;
  return false;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  if (isRateLimited(ip)) {
    return new Response('Too many submissions — try again later.', { status: 429 });
  }

  let body: {
    type: string;
    message: string;
    isAnonymous: boolean;
    userName?: string;
    userId?: string;
    stepsToReproduce?: string;
    whatHappened?: string;
  };

  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type, message, isAnonymous, userName, userId, stepsToReproduce, whatHappened } = body;

  if (!['general', 'bug'].includes(type)) {
    return new Response('Invalid type', { status: 400 });
  }
  if (!message || message.trim().length < 10) {
    return new Response('Message too short', { status: 400 });
  }
  if (type === 'bug' && (!stepsToReproduce?.trim() || !whatHappened?.trim())) {
    return new Response('Bug reports require steps and what happened', { status: 400 });
  }

  // Save to Supabase
  const supabase = supabaseServer();
  const { error: dbError } = await supabase.from('feedback').insert({
    type: type as 'general' | 'bug',
    message: message.trim(),
    is_anonymous: isAnonymous,
    user_id: isAnonymous ? null : (userId ?? null),
    user_name: isAnonymous ? null : (userName ?? null),
    steps_to_reproduce: type === 'bug' ? stepsToReproduce?.trim() ?? null : null,
    what_happened: type === 'bug' ? whatHappened?.trim() ?? null : null,
  });

  if (dbError) {
    console.error('[feedback] DB insert error:', dbError.message);
    return new Response('Failed to save feedback', { status: 500 });
  }

  // Send email via Resend
  if (process.env.RESEND_API_KEY && process.env.FEEDBACK_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = isAnonymous ? 'Anonymous' : (userName ?? 'Unknown User');
      const typeLabel = type === 'bug' ? 'Bug Report' : 'General Feedback';
      const submitted = new Date().toLocaleString('en-US', {
        month: 'long', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
      });

      const bugSection = type === 'bug' ? `

── Bug details ──────────────────────────────────
Steps to reproduce:
${stepsToReproduce}

What happened instead:
${whatHappened}` : '';

      const identityLine = isAnonymous
        ? 'From: Anonymous'
        : `From: ${userName ?? 'Unknown'}${userId ? ` (user_id: ${userId})` : ''}`;

      await resend.emails.send({
        from: 'ResumeForge <onboarding@resend.dev>',
        to: process.env.FEEDBACK_EMAIL,
        subject: `[ResumeForge] New ${typeLabel} — ${from}`,
        text: `Type: ${typeLabel}
${identityLine}
Submitted: ${submitted}

Message:
${message.trim()}${bugSection}

───────────────────────────────────────
Submitted via ResumeForge feedback form.`,
      });
    } catch (emailErr) {
      // Non-fatal — feedback is already saved to DB
      console.warn('[feedback] Email send failed:', emailErr instanceof Error ? emailErr.message : emailErr);
    }
  }

  return new Response(null, { status: 204 });
}
