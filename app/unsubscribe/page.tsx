'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function UnsubscribePage() {
  const params = useSearchParams();
  const uid = params.get('uid') ?? '';
  const token = params.get('token') ?? '';

  const [status, setStatus] = useState<'idle' | 'loading' | 'unsubscribed' | 'resubscribed' | 'error'>('idle');

  const valid = uid && token;

  const unsubscribe = async () => {
    setStatus('loading');
    const res = await fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    });
    setStatus(res.ok ? 'unsubscribed' : 'error');
  };

  const resubscribe = async () => {
    setStatus('loading');
    const res = await fetch('/api/unsubscribe', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, token }),
    });
    setStatus(res.ok ? 'resubscribed' : 'error');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <p className="text-sm text-muted-foreground tracking-widest uppercase">Easy Apply AI</p>

        {!valid && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Invalid unsubscribe link</h1>
            <p className="text-sm text-muted-foreground">This link is missing required parameters. Please use the unsubscribe link from the original email.</p>
          </>
        )}

        {valid && status === 'idle' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Unsubscribe from emails</h1>
            <p className="text-sm text-muted-foreground">You'll no longer receive lifecycle emails from Easy Apply AI. You can re-subscribe at any time.</p>
            <button
              onClick={unsubscribe}
              className="w-full bg-foreground text-background rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Unsubscribe
            </button>
            <a href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Cancel — take me back
            </a>
          </>
        )}

        {status === 'loading' && (
          <p className="text-sm text-muted-foreground">Just a moment…</p>
        )}

        {status === 'unsubscribed' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">You're unsubscribed</h1>
            <p className="text-sm text-muted-foreground">You won't receive any more emails from us. Changed your mind?</p>
            <button
              onClick={resubscribe}
              className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Re-subscribe
            </button>
          </>
        )}

        {status === 'resubscribed' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">You're back!</h1>
            <p className="text-sm text-muted-foreground">You'll receive helpful emails from Easy Apply AI again.</p>
            <a href="/" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
              Go to Easy Apply →
            </a>
          </>
        )}

        {status === 'error' && (
          <>
            <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">Please try again or contact us at <a href="mailto:hello@easy-apply.ai" className="underline">hello@easy-apply.ai</a>.</p>
          </>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense>
      <UnsubscribePage />
    </Suspense>
  );
}
