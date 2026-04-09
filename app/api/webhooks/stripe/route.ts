import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

type SubStatus = 'free' | 'pro' | 'canceled';

async function setSubscriptionStatus(customerId: string, status: SubStatus) {
  const supabase = supabaseServer();
  await supabase.from('users').update({ subscription_status: status }).eq('stripe_customer_id', customerId);
}

async function setStatusByUserId(userId: string, status: SubStatus, customerId: string) {
  const supabase = supabaseServer();
  await supabase.from('users').update({ subscription_status: status, stripe_customer_id: customerId }).eq('id', userId);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET not configured');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[stripe-webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription') break;
        const userId = session.metadata?.userId;
        const customerId = session.customer as string;
        if (!customerId) break;

        if (userId) {
          await setStatusByUserId(userId, 'pro', customerId);
        } else {
          await setSubscriptionStatus(customerId, 'pro');
        }
        console.log(`[stripe-webhook] checkout.session.completed → pro (customer: ${customerId})`);
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;
        const status: SubStatus = sub.status === 'active' ? 'pro' : 'canceled';
        await setSubscriptionStatus(customerId, status);
        console.log(`[stripe-webhook] subscription.updated → ${status} (customer: ${customerId})`);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await setSubscriptionStatus(sub.customer as string, 'canceled');
        console.log(`[stripe-webhook] subscription.deleted → canceled`);
        break;
      }

      case 'invoice.paid':
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await setSubscriptionStatus(customerId, 'pro');
          console.log(`[stripe-webhook] ${event.type} → pro renewal (customer: ${customerId})`);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        if (customerId) {
          await setSubscriptionStatus(customerId, 'canceled');
          console.log(`[stripe-webhook] payment_failed → canceled (customer: ${customerId})`);
        }
        break;
      }

      case 'checkout.session.expired':
      case 'customer.deleted':
        console.log(`[stripe-webhook] ${event.type} — no DB change needed`);
        break;

      default:
        // Always 200 for unhandled events — Stripe retries on non-200
        break;
    }
  } catch (err) {
    console.error('[stripe-webhook] Handler error:', err);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
