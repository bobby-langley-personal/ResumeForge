'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onClose: () => void;
}

type FeedbackType = 'general' | 'bug';

export default function FeedbackModal({ onClose }: Props) {
  const [type, setType] = useState<FeedbackType>('general');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const submit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, message }),
      });
      if (!res.ok) throw new Error(await res.text());
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">Send Feedback</h2>
          <button onClick={onClose} className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {done ? (
          <div className="space-y-4 text-center py-4">
            <p className="text-sm text-foreground">Thanks — feedback received.</p>
            <Button onClick={onClose} className="w-full">Close</Button>
          </div>
        ) : (
          <>
            {/* Type toggle */}
            <div className="flex gap-2">
              {(['general', 'bug'] as FeedbackType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors capitalize ${
                    type === t
                      ? 'bg-foreground text-background border-foreground'
                      : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                  }`}
                >
                  {t === 'bug' ? 'Bug Report' : 'General'}
                </button>
              ))}
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={type === 'bug' ? 'Describe what happened and how to reproduce it…' : 'Share a thought, suggestion, or anything on your mind…'}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={submit} disabled={submitting || !message.trim()} className="w-full">
              {submitting ? 'Sending…' : 'Send Feedback'}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
