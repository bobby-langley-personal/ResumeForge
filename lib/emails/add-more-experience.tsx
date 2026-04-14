export function addMoreExperienceHtml(name: string): string {
  const firstName = name?.split(' ')[0] || 'there';
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:560px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:40px;">
      <p style="margin:0 0 8px;font-size:13px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply AI</p>
      <h1 style="margin:0 0 24px;font-size:22px;font-weight:600;color:#f9fafb;">Want better resumes, ${firstName}? Add more to your library.</h1>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">The AI tailors your resume based entirely on what's in your Experience Library. One file is a good start — but adding a cover letter sample, a portfolio, or a second role's experience gives it much more to work with.</p>
      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#9ca3af;">More context = more accurate tailoring = better results on each application.</p>
      <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:#9ca3af;">You can upload any document: PDFs, Word files, or paste text directly.</p>
      <a href="https://www.easy-apply.ai/resumes" style="display:inline-block;background:#f9fafb;color:#0a0a0a;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600;">Add to My Experience →</a>
      <hr style="margin:40px 0;border:none;border-top:1px solid #222;">
      <p style="margin:0;font-size:12px;color:#4b5563;">You're receiving this because you signed up for Easy Apply AI. <a href="https://www.easy-apply.ai" style="color:#6b7280;">easy-apply.ai</a></p>
    </div>
  </div>
</body>
</html>`;
}

export const addMoreExperienceSubject = 'Get better tailored resumes — add more experience';
