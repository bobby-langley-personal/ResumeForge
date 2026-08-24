import { vi } from 'vitest';

// Stub Next.js server-only module (not available in test env)
vi.mock('server-only', () => ({}));

// Provide required env vars for all tests
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_SERVICE_KEY = 'test-service-key';
process.env.CLERK_SECRET_KEY = 'sk_test_clerk';
process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
process.env.STRIPE_SECRET_KEY = 'sk_test_stripe';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
process.env.ADMIN_SECRET = 'test-admin-secret';
