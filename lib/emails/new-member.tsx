export function newMemberHtml(userEmail: string, userName: string | null, signedUpAt: string): string {
  const displayName = userName || userEmail;
  const date = new Date(signedUpAt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZone: 'America/Denver',
  });

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e7eb;">
  <div style="max-width:480px;margin:40px auto;padding:0 20px;">
    <div style="background:#111;border:1px solid #222;border-radius:12px;padding:32px;">
      <p style="margin:0 0 6px;font-size:12px;color:#6b7280;letter-spacing:0.05em;text-transform:uppercase;">Easy Apply Admin</p>
      <h2 style="margin:0 0 20px;font-size:18px;font-weight:600;color:#f9fafb;">New member signed up</h2>
      <table style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr>
          <td style="padding:8px 0;color:#6b7280;width:80px;">Name</td>
          <td style="padding:8px 0;color:#f9fafb;">${displayName}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Email</td>
          <td style="padding:8px 0;color:#f9fafb;">${userEmail}</td>
        </tr>
        <tr>
          <td style="padding:8px 0;color:#6b7280;">Signed up</td>
          <td style="padding:8px 0;color:#9ca3af;">${date} MT</td>
        </tr>
      </table>
    </div>
  </div>
</body>
</html>`;
}

export const newMemberSubject = (userEmail: string) => `New Easy Apply signup: ${userEmail}`;
