import { vi } from 'vitest';

vi.mock('@/lib/log-api', () => ({
  logApiCall: vi.fn(),
}));

vi.mock('@/lib/log-user-event', () => ({
  logUserEvent: vi.fn(),
}));
