import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

export const PRICE_IDS = {
  monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID!,
  quarterly: process.env.STRIPE_PRO_QUARTERLY_PRICE_ID!,
  annual: process.env.STRIPE_PRO_ANNUAL_PRICE_ID!,
} as const;

export const FREE_RESUME_LIMIT = 3;
