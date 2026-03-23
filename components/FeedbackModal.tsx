'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeedbackModalProps {
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug';

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { user, isSignedIn } = useUser();
  const displayName = user?.fullName ?? user?.firstName ?? '';

  const [isAnonymous, setIsAnonymous] = useState(true);
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [stepsToReproduce, setStepsToReproduce] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isValid =
    message.trim().length >= 10 &&
    (type === 'general' || (stepsToReproduce.trim().length > 0 && whatHappened.trim().length > 0));

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          message,
          isAnonymous,
          userName: isAnonymous ? undefined : displayName,
          userId: isAnonymous ? undefined : user?.id,
          stepsToReproduce: type === 'bug' ? stepsToReproduce : undefined,
          whatHappened: type === 'bug' ? whatHappened : undefined,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }
      setSuccess(true);
      setTimeout(onClose, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-xl shadow-xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Share your feedback</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center gap-3 px-5 py-12 text-center">
            <CheckCircle className="w-10 h-10 text-green-500" />
            <p className="font-semibold text-foreground">Thanks for the feedback!</p>
            <p className="text-sm text-muted-foreground">
              It goes straight to Bobby and helps make ResumeForge better for everyone.
            </p>
          </div>
        ) : (
          <div className="px-5 py-5 space-y-5">
            {/* Identity toggle */}
            {isSignedIn && displayName && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Submit as</p>
                <div className="flex gap-4">
                  {(['Anonymous', displayName] as const).map((label, i) => (
                    <label key={label} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="radio"
                        name="identity"
                        checked={i === 0 ? isAnonymous : !isAnonymous}
                        onChange={() => setIsAnonymous(i === 0)}
                        className="accent-primary"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Type toggle */}
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Type</p>
              <div className="flex gap-4">
                {(['general', 'bug'] as FeedbackType[]).map(t => (
                  <label key={t} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="type"
                      checked={type === t}
                      onChange={() => setType(t)}
                      className="accent-primary"
                    />
                    {t === 'general' ? 'General feedback' : 'Bug report'}
                  </label>
                ))}
              </div>
            </div>

            {/* Main message */}
            <div className="space-y-1.5">
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="What's on your mind? Be as detailed as you like."
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              {message.trim().length > 0 && message.trim().length < 10 && (
                <p className="text-xs text-muted-foreground">At least 10 characters required</p>
              )}
            </div>

            {/* Bug-only fields */}
            {type === 'bug' && (
              <div className="space-y-3 pt-1 border-t border-border">
                <p className="text-xs font-medium text-muted-foreground pt-2">Bug report details</p>
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">What were you trying to do?</label>
                  <textarea
                    value={stepsToReproduce}
                    onChange={e => setStepsToReproduce(e.target.value)}
                    placeholder="Describe the steps that led to the issue."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm text-foreground">What happened instead?</label>
                  <textarea
                    value={whatHappened}
                    onChange={e => setWhatHappened(e.target.value)}
                    placeholder="Describe the unexpected behaviour."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Anonymous notice */}
            {isAnonymous && (
              <p className="text-xs text-muted-foreground">
                🔒 Anonymous submissions never include your name, email, or account information.
              </p>
            )}

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!isValid || submitting}
            >
              {submitting ? 'Submitting…' : 'Submit Feedback'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
