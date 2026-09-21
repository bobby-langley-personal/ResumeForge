export function grandfatherPricingHtml(name: string, unsubscribeLink: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:40px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply AI</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#f9fafb;">Your price is locked, ${firstName} — no change for you.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">We're updating Easy Apply AI's pricing for new subscribers. As an existing Pro member, your subscription stays exactly as it is — same price, same billing cycle, no action needed.</p>
      <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#9ca3af;"><strong style="color:#e5e7eb;">What's changing for new subscribers:</strong></p>
      <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:2;color:#9ca3af;">
        <li>New monthly price: <strong style="color:#e5e7eb;">$16/mo</strong> (was $9)</li>
        <li>New quarterly: <strong style="color:#e5e7eb;">$42/3 months</strong></li>
        <li>New annual: <strong style="color:#e5e7eb;">$134/yr</strong></li>
      </ul>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">Your existing subscription is not affected. You're grandfathered at your current rate for as long as you stay subscribed.</p>
      <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#9ca3af;">We've also shipped a few new features alongside this — DOCX export, a keyword match score on fit analysis, and persistent navigation. All yours to use.</p>
      <a href="https://www.easy-apply.ai/tailor" style="display:inline-block;background:#f9fafb;color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Go to Easy Apply →</a>
      <hr style="margin:40px 0;border:none;border-top:1px solid #222;">
      <p style="margin:0;font-size:12px;color:#4b5563;">You're receiving this because you're a Pro subscriber on Easy Apply AI. <a href="https://www.easy-apply.ai" style="color:#6b7280;">easy-apply.ai</a> · <a href="${unsubscribeLink}" style="color:#6b7280;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const grandfatherPricingSubject = "Your Easy Apply price is locked — here's what's changing for new subscribers";
