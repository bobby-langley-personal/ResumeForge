'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Check, Loader2, Crown } from 'lucide-react';

interface BillingStatus {
  subscription_status: string;
  tailored_resume_count: number;
}

type Plan = 'monthly' | 'quarterly' | 'annual';

const PLANS: { key: Plan; label: string; price: string; period: string; badge: string | null; highlight?: boolean }[] = [
  { key: 'monthly',   label: 'Monthly',   price: '$19',  period: '/mo',        badge: null },
  { key: 'quarterly', label: 'Quarterly', price: '$47',  period: '/3 months',  badge: 'Save 18%' },
  { key: 'annual',    label: 'Annual',    price: '$149', period: '/yr',        badge: 'Save 35%', highlight: true },
];

const PRO_FEATURES = [
  'Unlimited tailored resumes',
  'Cover letters',
  'Polished resume generator',
  'Interview prep',
  'Chrome extension full access',
  'Application Q&A answers',
];

const FREE_LIMITS = [
  '3 free tailored resumes (lifetime)',
  'No cover letters',
  'No polished resume',
  'No interview prep',
];

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(setBilling)
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  const isPro = billing?.subscription_status === 'pro';

  const handleGetStarted = async (plan: Plan) => {
    if (!isSignedIn) { router.push('/sign-in'); return; }
    setLoading(plan);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setLoading(null);
    }
  };

  const handleManage = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error('Portal error:', err);
      setPortalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-foreground mb-4">Simple, transparent pricing</h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Start free. Upgrade when you&apos;re ready to go all in on your job search.
          </p>
        </div>

        {/* Already Pro banner */}
        {isPro && (
          <div className="flex items-center justify-center gap-3 mb-8 p-4 bg-primary/10 border border-primary/20 rounded-lg">
            <Crown className="w-5 h-5 text-primary" />
            <span className="text-foreground font-medium">You&apos;re on Pro — all features unlocked.</span>
            <button
              onClick={handleManage}
              disabled={portalLoading}
              className="text-sm text-blue-500 underline hover:text-blue-400 ml-2"
            >
              {portalLoading ? 'Loading…' : 'Manage subscription'}
            </button>
          </div>
        )}

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`relative flex flex-col rounded-xl border p-6 ${
                plan.highlight ? 'border-primary bg-primary/5' : 'border-border bg-card'
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                  {plan.badge}
                </span>
              )}

              <div className="mb-6">
                <p className="text-sm font-medium text-muted-foreground mb-1">{plan.label}</p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground mb-1">{plan.period}</span>
                </div>
              </div>

              {isPro ? (
                <div className="flex items-center gap-2 text-sm font-medium text-primary mb-6">
                  <Check className="w-4 h-4" />
                  You&apos;re on Pro ✓
                </div>
              ) : (
                <Button
                  className="mb-6 w-full"
                  variant={plan.highlight ? 'default' : 'outline'}
                  disabled={loading === plan.key}
                  onClick={() => handleGetStarted(plan.key)}
                >
                  {loading === plan.key ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading…
                    </span>
                  ) : 'Get Started'}
                </Button>
              )}

              <ul className="space-y-2.5 flex-1">
                {PRO_FEATURES.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-foreground">
                    <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>

              {isPro && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-4 text-muted-foreground"
                  onClick={handleManage}
                  disabled={portalLoading}
                >
                  {portalLoading ? 'Loading…' : 'Manage subscription'}
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Free tier callout */}
        <div className="border border-border rounded-xl p-6 bg-card max-w-md mx-auto text-center">
          <h3 className="font-semibold text-foreground mb-2">Free plan</h3>
          <p className="text-sm text-muted-foreground mb-4">Try it out, no credit card required.</p>
          <ul className="space-y-1.5 text-left inline-block">
            {FREE_LIMITS.map(l => (
              <li key={l} className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="text-destructive font-bold">✕</span>
                {l}
              </li>
            ))}
          </ul>
          {!isSignedIn && (
            <div className="mt-4">
              <Link href="/sign-up">
                <Button variant="outline" size="sm">Start for free</Button>
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
