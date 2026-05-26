export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { Resend } from 'resend';

export async function POST(req: NextRequest) {
  const secret = process.env.ADMIN_SECRET;
  if (!secret || req.headers.get('x-admin-secret') !== secret) {
    return new Response('Unauthorized', { status: 401 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return Response.json({ ok: false, error: 'RESEND_API_KEY is not configured' }, { status: 500 });
  }

  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) {
    return Response.json({ ok: false, error: 'ADMIN_NOTIFICATION_EMAIL is not configured' }, { status: 500 });
  }

  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL ?? 'Easy Apply AI <hello@easy-apply.ai>';
  const resend = new Resend(resendKey);

  const { error } = await resend.emails.send({
    from: fromEmail,
    to: adminEmail,
    subject: '[Easy Apply Admin] Test email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:40px auto;padding:32px;background:#111;border:1px solid #222;border-radius:12px;color:#e5e7eb;">
        <p style="margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">Easy Apply Admin</p>
        <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#f9fafb;">Test email confirmed</h2>
        <p style="margin:0;font-size:14px;color:#9ca3af;line-height:1.6;">Resend is configured and sending correctly. Sent at ${new Date().toUTCString()}.</p>
      </div>
    `,
  });

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, sentTo: adminEmail });
}
