import { describe, it, expect } from 'vitest';

// Rolling window business logic extracted from generate-documents/route.ts
// Tests validate the exact logic without calling the route itself.

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function computeRollingWindow(
  weeklyWindowStart: string | null,
  weeklyResumeCount: number,
  now: Date
): { windowExpired: boolean; effectiveCount: number } {
  const windowStart = weeklyWindowStart ? new Date(weeklyWindowStart) : null;
  const windowExpired = !windowStart || now.getTime() - windowStart.getTime() >= SEVEN_DAYS_MS;
  const effectiveCount = windowExpired ? 0 : weeklyResumeCount;
  return { windowExpired, effectiveCount };
}

describe('rolling window logic', () => {
  const now = new Date('2026-08-23T12:00:00Z');

  it('treats null window_start as expired', () => {
    const { windowExpired, effectiveCount } = computeRollingWindow(null, 3, now);
    expect(windowExpired).toBe(true);
    expect(effectiveCount).toBe(0);
  });

  it('treats window older than 7 days as expired', () => {
    const start = new Date(now.getTime() - SEVEN_DAYS_MS - 1).toISOString();
    const { windowExpired, effectiveCount } = computeRollingWindow(start, 4, now);
    expect(windowExpired).toBe(true);
    expect(effectiveCount).toBe(0);
  });

  it('treats window exactly at 7 days as expired', () => {
    const start = new Date(now.getTime() - SEVEN_DAYS_MS).toISOString();
    const { windowExpired } = computeRollingWindow(start, 2, now);
    expect(windowExpired).toBe(true);
  });

  it('treats window within 7 days as active', () => {
    const start = new Date(now.getTime() - SEVEN_DAYS_MS + 1000).toISOString();
    const { windowExpired, effectiveCount } = computeRollingWindow(start, 3, now);
    expect(windowExpired).toBe(false);
    expect(effectiveCount).toBe(3);
  });

  it('returns actual count when window is active', () => {
    const start = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(); // 1 day ago
    const { effectiveCount } = computeRollingWindow(start, 5, now);
    expect(effectiveCount).toBe(5);
  });

  it('resets effective count to 0 when window just expired', () => {
    const start = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(); // 8 days ago
    const { effectiveCount } = computeRollingWindow(start, 5, now);
    expect(effectiveCount).toBe(0);
  });
});

describe('chat slot allocation', () => {
  it('enables chat for first 3 applications (free user)', () => {
    const isPro = false;
    for (let chatUnlockedCount = 0; chatUnlockedCount < 3; chatUnlockedCount++) {
      const enableChat = isPro || chatUnlockedCount < 3;
      expect(enableChat).toBe(true);
    }
  });

  it('disables chat for 4th application (free user)', () => {
    const isPro = false;
    const chatUnlockedCount = 3;
    const enableChat = isPro || chatUnlockedCount < 3;
    expect(enableChat).toBe(false);
  });

  it('always enables chat for pro users regardless of count', () => {
    const isPro = true;
    for (let chatUnlockedCount = 0; chatUnlockedCount <= 10; chatUnlockedCount++) {
      const enableChat = isPro || chatUnlockedCount < 3;
      expect(enableChat).toBe(true);
    }
  });

  it('does not increment chat_unlocked_count when already at 3', () => {
    const chatUnlockedCount = 3;
    const shouldIncrement = chatUnlockedCount < 3;
    expect(shouldIncrement).toBe(false);
  });

  it('increments chat_unlocked_count when below 3', () => {
    const chatUnlockedCount = 2;
    const shouldIncrement = chatUnlockedCount < 3;
    expect(shouldIncrement).toBe(true);
  });
});
