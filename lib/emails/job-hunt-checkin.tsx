export function jobHuntCheckinHtml(name: string, unsubscribeLink: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:40px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply AI</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#f9fafb;">How's the job hunt going, ${firstName}?</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">It's been a little while since you last generated a resume. Whether you're still actively applying or just keeping options open — Easy Apply is here when you need it.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">A few things that might help right now:</p>
      <ul style="margin:0 0 32px;padding-left:20px;font-size:15px;line-height:2;color:#9ca3af;">
        <li>Tailor a resume to a new role in ~30 seconds</li>
        <li>Use AI chat to refine an existing resume</li>
        <li>Run a fresh fit analysis on any saved application</li>
        <li>Prep for an interview with AI-generated questions</li>
      </ul>
      <a href="https://www.easy-apply.ai/tailor" style="display:inline-block;background:#f9fafb;color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Back to Easy Apply →</a>
      <hr style="margin:40px 0;border:none;border-top:1px solid #222;">
      <p style="margin:0;font-size:12px;color:#4b5563;">You're receiving this because you signed up for Easy Apply AI. <a href="https://www.easy-apply.ai" style="color:#6b7280;">easy-apply.ai</a> · <a href="${unsubscribeLink}" style="color:#6b7280;">Unsubscribe</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const jobHuntCheckinSubject = "How's the job hunt going?";
