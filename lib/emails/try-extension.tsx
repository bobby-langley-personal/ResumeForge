export function tryExtensionHtml(name: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:40px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply AI</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#f9fafb;">Save time on every application, ${firstName}</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">The Easy Apply Chrome Extension reads the job page you're on — LinkedIn, Indeed, Greenhouse, Lever, Workday — and automatically fills in the company, title, and job description for you.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">One click to open the panel, one click to generate. No copy-pasting.</p>
      <a href="https://chromewebstore.google.com/detail/foodpkmblpknlbkmdnnlgjkbnnhmbcid" style="display:inline-block;background:#f9fafb;color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;margin-bottom:12px;">Install the Extension →</a>
      <p style="margin:12px 0 0;font-size:13px;color:#6b7280;">Free to install · Works in Chrome and Edge</p>
      <hr style="margin:40px 0;border:none;border-top:1px solid #222;">
      <p style="margin:0;font-size:12px;color:#4b5563;">You're receiving this because you signed up for Easy Apply AI. <a href="https://www.easy-apply.ai" style="color:#6b7280;">easy-apply.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const tryExtensionSubject = 'Save time on every application — try the Chrome Extension';
