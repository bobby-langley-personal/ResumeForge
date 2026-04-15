import { createHmac } from 'crypto';

const secret = () => process.env.UNSUBSCRIBE_SECRET ?? 'fallback-dev-secret';

export function generateUnsubscribeToken(userId: string): string {
  return createHmac('sha256', secret()).update(userId).digest('hex');
}

export function verifyUnsubscribeToken(userId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(userId);
  // Constant-time comparison to prevent timing attacks
  if (expected.length !== token.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ token.charCodeAt(i);
  }
  return diff === 0;
}

export function unsubscribeUrl(userId: string): string {
  const token = generateUnsubscribeToken(userId);
  return `https://www.easy-apply.ai/unsubscribe?uid=${encodeURIComponent(userId)}&token=${token}`;
}
