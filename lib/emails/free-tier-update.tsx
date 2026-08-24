export function freeTierUpdateHtml(name: string, unsubscribeLink: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:40px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply AI</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#f9fafb;">Good news, ${firstName} — your free résumés just reset.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">We updated how free résumés work on Easy Apply. You previously hit the limit under the old system — that cap is gone.</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#9ca3af;"><strong style="color:#e5e7eb;">What changed:</strong></p>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:2;color:#9ca3af;">
        <li>Old: 3 lifetime résumés, then locked</li>
        <li>New: <strong style="color:#e5e7eb;">5 résumés every 7 days</strong>, rolling — resets automatically each week</li>
      </ul>
      <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#9ca3af;">You have a fresh 5 to use right now. If you're actively applying, come back in and tailor a few — no paywall in the way.</p>
      <a href="https://www.easy-apply.ai/tailor" style="display:inline-block;background:#f9fafb;color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Tailor a résumé now →</a>
      <hr style="margin:40px 0;border:none;border-top:1px solid #222;">
      <p style="margin:0;font-size:12px;color:#4b5563;">You're receiving this because you signed up for Easy Apply AI. <a href="https://www.easy-apply.ai" style="color:#6b7280;">easy-apply.ai</a> · <a href="https://www.easy-apply.ai/pricing" style="color:#6b7280;">Upgrade to Pro</a> · <a href="${unsubscribeLink}" style="color:#6b7280;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const freeTierUpdateSubject = "Your free résumés just reset — here's what changed";
