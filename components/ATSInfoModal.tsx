'use client';

import { useEffect, useRef } from 'react';
import { ShieldCheck, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const PITFALLS = [
  'Tables, columns, and graphics that ATS software misreads or skips entirely',
  'Non-standard section headers — "My Journey" instead of "Work Experience"',
  'Fancy fonts, text in shapes, or content inside headers/footers',
  'Important keywords buried inside complex PDF layouts',
];

const WHAT_WE_DO = [
  'Single-column, clean layout — the format every ATS expects',
  'Standard section headers: Summary, Experience, Skills, Education',
  'Plain, parseable PDF output built for machines first, humans second',
  'Keywords from the job description woven naturally into your bullets',
];

export default function ATSInfoModal({ onClose }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
    >
      <div className="w-full max-w-lg bg-background border border-border rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-4 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border">
          <div className="p-2 rounded-lg bg-emerald-500/10">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">What is ATS — and why does it matter?</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Applicant Tracking System</p>
          </div>
        </div>

        {/* Body */}
        <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5 max-h-[60vh] sm:max-h-[70vh] overflow-y-auto">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Most companies today use <strong className="text-foreground">Applicant Tracking Systems</strong> —
            software that automatically scans, parses, and ranks every resume submitted before a human
            recruiter ever sees it. If your resume can&apos;t be read by the software, it gets
            filtered out no matter how qualified you are.
          </p>

          <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive">Common ATS pitfalls</p>
            </div>
            {PITFALLS.map((p) => (
              <div key={p} className="flex items-start gap-2">
                <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-snug">{p}</p>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-2.5">
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-500">How Easy Apply handles it</p>
            </div>
            {WHAT_WE_DO.map((item) => (
              <div key={item} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-snug">{item}</p>
              </div>
            ))}
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
            Studies estimate that <strong className="text-foreground">75% of resumes are rejected by ATS</strong>{' '}
            before a human sees them. Every resume Easy Apply generates is ATS-optimized by design —
            so your qualifications actually reach the people hiring.
          </p>
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 pb-5 sm:pb-6 pt-2">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm transition-colors"
          >
            Got it — let&apos;s build my resume
          </button>
        </div>
      </div>
    </div>
  );
}
