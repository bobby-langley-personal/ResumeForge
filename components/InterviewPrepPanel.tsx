'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle2, RefreshCw, Target } from 'lucide-react';
import { InterviewPrep, InterviewQuestion, InterviewQuestionCategory } from '@/types/interview-prep';

const CATEGORY_STYLES: Record<InterviewQuestionCategory, { label: string; className: string }> = {
  technical:   { label: 'Technical',   className: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  behavioral:  { label: 'Behavioral',  className: 'bg-purple-500/10 text-purple-400 border-purple-500/20' },
  motivation:  { label: 'Motivation',  className: 'bg-green-500/10 text-green-400 border-green-500/20' },
  background:  { label: 'Background',  className: 'bg-slate-500/10 text-slate-400 border-slate-500/20' },
  situational: { label: 'Situational', className: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  curveball:   { label: 'Curveball',   className: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function QuestionCard({ q, index, practiced, onTogglePracticed }: {
  q: InterviewQuestion;
  index: number;
  practiced: boolean;
  onTogglePracticed: () => void;
}) {
  const [open, setOpen] = useState(false);
  const style = CATEGORY_STYLES[q.category] ?? CATEGORY_STYLES.background;

  return (
    <div className={`border rounded-lg overflow-hidden transition-colors ${practiced ? 'border-green-500/30 bg-green-500/5' : 'border-border'}`}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        {practiced ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <span className="w-4 h-4 rounded-full border border-border shrink-0" />
        )}
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border shrink-0 ${style.className}`}>
          {style.label}
        </span>
        <span className="text-sm text-foreground flex-1 text-left">{q.question}</span>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
            <div className="space-y-1.5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Answer hints</p>
              <ul className="space-y-1">
                {q.hint.map((h, i) => (
                  <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                    <span className="text-muted-foreground/50 shrink-0">•</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
            {q.resumeReference && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">From your resume</p>
                <blockquote className="border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground italic">
                  {q.resumeReference}
                </blockquote>
              </div>
            )}
            <button
              onClick={onTogglePracticed}
              className={`text-xs font-medium transition-colors ${practiced ? 'text-green-500 hover:text-green-400' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {practiced ? '✓ Practiced' : 'Mark as practiced'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface InterviewPrepPanelProps {
  prep: InterviewPrep;
  applicationId: string;
  onRegenerate: () => void;
  regenerating?: boolean;
}

export default function InterviewPrepPanel({ prep, applicationId, onRegenerate, regenerating }: InterviewPrepPanelProps) {
  const storageKey = `interview_prep_practiced_${applicationId}`;
  const [practiced, setPracticed] = useState<Set<number>>(new Set());

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setPracticed(new Set(JSON.parse(saved)));
    } catch { /* ignore */ }
  }, [storageKey]);

  const togglePracticed = (index: number) => {
    setPracticed(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      try { localStorage.setItem(storageKey, JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  const practicedCount = practiced.size;
  const total = prep.questions.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {practicedCount}/{total} practiced
        </p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
          {regenerating ? 'Regenerating…' : 'Regenerate questions'}
        </button>
      </div>

      <div className="space-y-2">
        {prep.questions.map((q, i) => (
          <QuestionCard
            key={i}
            index={i}
            q={q}
            practiced={practiced.has(i)}
            onTogglePracticed={() => togglePracticed(i)}
          />
        ))}
      </div>
    </div>
  );
}

// Collapsible wrapper used on the home page post-generation
export function InterviewPrepSection({ applicationId, jobTitle, company, jobDescription, generatedResume, toughQuestions }: {
  applicationId: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  generatedResume: string;
  toughQuestions?: string[];
}) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const generate = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/interview-prep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId, jobTitle, company, jobDescription, generatedResume, toughQuestions }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: InterviewPrep = await res.json();
      setPrep(data);
      setExpanded(true);
    } catch {
      setError('Failed to generate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-6 border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => prep ? setExpanded(v => !v) : generate()}
        disabled={loading}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/50 transition-colors disabled:opacity-70"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Target className="w-4 h-4 text-primary" />
          Interview Prep
          {prep && <span className="text-xs font-normal text-muted-foreground ml-1">({prep.questions.length} questions)</span>}
        </span>
        <span className="text-sm text-muted-foreground">
          {loading ? 'Generating…' : prep ? (expanded ? '▲' : '▼') : 'Prepare me →'}
        </span>
      </button>

      {error && <p className="px-5 pb-3 text-xs text-destructive">{error}</p>}

      {prep && expanded && (
        <div className="px-5 pb-5 pt-2 border-t border-border">
          <InterviewPrepPanel
            prep={prep}
            applicationId={applicationId}
            onRegenerate={generate}
            regenerating={loading}
          />
        </div>
      )}
    </div>
  );
}
