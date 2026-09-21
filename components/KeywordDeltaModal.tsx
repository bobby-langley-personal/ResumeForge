'use client';

import { useEffect } from 'react';
import { X } from 'lucide-react';
import { computeMatchScore } from '@/lib/keyword-score';

interface Props {
  allKeywords: string[];       // matched + missing from fitAnalysis
  missingBefore: string[];     // keywords not in background (fitAnalysis.keywords.missing)
  resumeContent: string;       // generated resume text
  onClose: () => void;
}

export default function KeywordDeltaModal({ allKeywords, missingBefore, resumeContent, onClose }: Props) {
  const { matched: nowInResume } = computeMatchScore(allKeywords, resumeContent);
  const nowInResumeSet = new Set(nowInResume);

  const added = missingBefore.filter(kw => nowInResumeSet.has(kw));
  const stillMissing = missingBefore.filter(kw => !nowInResumeSet.has(kw));

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div>
            <h2 className="text-lg font-semibold">What Changed</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Keywords from the job description that were missing in your background
            </p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors ml-4">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 space-y-6">
          {/* Added */}
          <div>
            <h3 className="text-sm font-semibold text-green-600 mb-2">
              Added to your resume ({added.length})
            </h3>
            {added.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {added.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-md text-xs border border-green-500/40 text-green-600 bg-green-500/10"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">None — the AI couldn't source these from your background documents.</p>
            )}
          </div>

          {/* Still missing */}
          {stillMissing.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-500 mb-2">
                Still missing ({stillMissing.length})
              </h3>
              <p className="text-xs text-muted-foreground mb-3">
                These terms weren't found in your background documents, so the AI couldn't honestly add them.
                If you have relevant experience, use Resume Chat to add them manually.
              </p>
              <div className="flex flex-wrap gap-2">
                {stillMissing.map(kw => (
                  <span
                    key={kw}
                    className="px-2.5 py-1 rounded-md text-xs border border-red-500/30 text-red-500 bg-red-500/10"
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
