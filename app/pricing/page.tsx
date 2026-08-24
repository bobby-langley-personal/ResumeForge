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
  { key: 'monthly',   label: 'Monthly',   price: '$9',  period: '/mo',        badge: null },
  { key: 'quarterly', label: 'Quarterly', price: '$23', period: '/3 months',  badge: 'Save 15%' },
  { key: 'annual',    label: 'Annual',    price: '$79', period: '/yr',        badge: 'Save 27%', highlight: true },
];

const PRO_FEATURES = [
  'Unlimited tailored resumes',
  'Cover letters',
  'Polished resume generator',
  'Interview prep',
  'Chrome extension full access',
  'Application Q&A answers',
];

const COMPARE_ROWS: { label: string; free: string | boolean; pro: string | boolean }[] = [
  { label: 'Tailored résumés',        free: '5 / week',   pro: 'Unlimited' },
  { label: 'Cover letters',           free: false,        pro: true },
  { label: 'Polished resume builder', free: false,        pro: true },
  { label: 'Chrome extension',        free: 'Basic',      pro: 'Full access' },
  { label: 'Interview prep',          free: '2 sessions', pro: 'Unlimited' },
  { label: 'AI experience interview', free: '2 roles',    pro: 'Unlimited' },
  { label: 'Résumé chat',             free: '3 résumés',  pro: 'Unlimited' },
  { label: 'Application Q&A',         free: false,        pro: true },
];

export default function PricingPage() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [loading, setLoading] = useState<Plan | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pricing_page_viewed' }),
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch('/api/billing/status')
      .then(r => r.json())
      .then(setBilling)
      .catch(() => {});
  }, [isLoaded, isSignedIn]);

  const isPro = billing?.subscription_status === 'pro';

  const handleGetStarted = async (plan: Plan) => {
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pricing_plan_clicked', plan }),
    }).catch(() => {});
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
    fetch('/api/log-event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'pricing_manage_clicked' }),
    }).catch(() => {});
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

        {/* Free vs Pro comparison table */}
        <div className="border border-border rounded-xl overflow-hidden">
          <div className="grid grid-cols-3 bg-muted/40 px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <div>Feature</div>
            <div className="text-center">Free</div>
            <div className="text-center text-primary">Pro</div>
          </div>
          {COMPARE_ROWS.map((row, i) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 px-4 py-3 text-sm items-center ${i < COMPARE_ROWS.length - 1 ? 'border-b border-border' : ''}`}
            >
              <div className="text-foreground">{row.label}</div>
              <div className="text-center">
                {row.free === false ? (
                  <span className="text-destructive font-bold text-base leading-none">✕</span>
                ) : (
                  <span className="text-muted-foreground">{row.free === true ? <Check className="w-4 h-4 text-primary mx-auto" /> : row.free}</span>
                )}
              </div>
              <div className="text-center">
                {row.pro === true ? (
                  <Check className="w-4 h-4 text-primary mx-auto" />
                ) : (
                  <span className="text-foreground font-medium">{row.pro}</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Free plan CTA */}
        {!isSignedIn && (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-3">No credit card required — try it free.</p>
            <Link href="/sign-up">
              <Button variant="outline">Start for free</Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
