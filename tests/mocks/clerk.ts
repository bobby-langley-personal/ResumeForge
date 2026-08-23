import { vi } from 'vitest';

export let mockUserId: string | null = 'user_test_123';

export function setMockUserId(id: string | null) {
  mockUserId = id;
}

vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(() => Promise.resolve({ userId: mockUserId })),
  clerkClient: vi.fn(),
}));
