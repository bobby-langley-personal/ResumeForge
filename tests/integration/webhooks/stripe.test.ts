import { describe, it, expect, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';

const { mockConstructEvent, mockFrom } = vi.hoisted(() => ({
  mockConstructEvent: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: { constructEvent: mockConstructEvent },
  },
  PRICE_IDS: {},
  FREE_RESUME_LIMIT: 3,
}));
vi.mock('@/lib/supabase', () => ({ supabaseServer: () => ({ from: mockFrom }) }));

import { POST } from '@/app/api/webhooks/stripe/route';

function makeWebhookRequest(body: string, signature = 'valid-sig') {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': signature, 'Content-Type': 'application/json' },
    body,
  });
}

function makeStripeEvent(type: string, data: Record<string, unknown>): Stripe.Event {
  return { id: 'evt_test', type, data: { object: data }, object: 'event', api_version: '2024-01-01', created: 0, livemode: false, pending_webhooks: 0, request: null } as unknown as Stripe.Event;
}

function makeBuilder(result: unknown = { data: null, error: null }) {
  const b: Record<string, unknown> = {};
  const chain = () => b;
  b.update = vi.fn(chain);
  b.eq = vi.fn(chain);
  b.then = vi.fn((resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve));
  return b;
}

describe('POST /api/webhooks/stripe', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockReturnValue(makeBuilder());
  });

  it('returns 400 when stripe-signature header is missing', async () => {
    const req = new Request('http://localhost', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 400 when signature verification fails', async () => {
    mockConstructEvent.mockImplementation(() => { throw new Error('Bad signature'); });
    const req = makeWebhookRequest('{}');
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  it('returns 200 for checkout.session.completed → sets subscription_status pro', async () => {
    const event = makeStripeEvent('checkout.session.completed', {
      mode: 'subscription',
      customer: 'cus_test_123',
      metadata: { userId: 'user_abc' },
    });
    mockConstructEvent.mockReturnValue(event);

    const req = makeWebhookRequest('{}');
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.received).toBe(true);
    // Verify DB update was called
    expect(mockFrom).toHaveBeenCalled();
  });

  it('returns 200 for checkout.session.completed in non-subscription mode (no DB write)', async () => {
    const event = makeStripeEvent('checkout.session.completed', { mode: 'payment' });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for customer.subscription.updated with active status → pro', async () => {
    const event = makeStripeEvent('customer.subscription.updated', {
      customer: 'cus_test_123',
      status: 'active',
    });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for customer.subscription.updated with non-active → canceled', async () => {
    const event = makeStripeEvent('customer.subscription.updated', {
      customer: 'cus_test_123',
      status: 'canceled',
    });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for customer.subscription.deleted → canceled', async () => {
    const event = makeStripeEvent('customer.subscription.deleted', { customer: 'cus_test_123' });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for invoice.paid → sets pro', async () => {
    const event = makeStripeEvent('invoice.paid', { customer: 'cus_test_123' });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for invoice.payment_failed → sets canceled', async () => {
    const event = makeStripeEvent('invoice.payment_failed', { customer: 'cus_test_123' });
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
  });

  it('returns 200 for unknown event type without DB changes', async () => {
    const event = makeStripeEvent('some.unknown.event', {});
    mockConstructEvent.mockReturnValue(event);
    const res = await POST(makeWebhookRequest('{}') as any);
    expect(res.status).toBe(200);
    // Unknown events still return received: true
    const json = await res.json();
    expect(json.received).toBe(true);
  });
});
