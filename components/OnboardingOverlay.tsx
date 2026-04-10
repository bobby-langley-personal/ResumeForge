'use client';

import { Library, FileText, Zap, ArrowRight, Sparkles } from 'lucide-react';

interface Props {
  onDismiss: () => void;
}

export default function OnboardingOverlay({ onDismiss }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col overflow-y-auto">
      {/* Top bar */}
      <div className="shrink-0 flex items-center gap-2 px-6 py-5 border-b border-border">
        <Sparkles className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-semibold text-foreground">
          Easy Apply<sup className="text-blue-500 text-[10px] font-bold ml-0.5 align-super">AI</sup>
        </span>
      </div>

      {/* Main content — vertically centred on tall screens, scrollable on short */}
      <div className="flex-1 flex items-start sm:items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl space-y-10">

          {/* Heading */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 text-xs font-semibold px-3 py-1.5 rounded-full border border-blue-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              One quick thing before you start
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground leading-tight">
              Let&apos;s set up your{' '}
              <span className="text-blue-500">Experience Library</span>
            </h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
              Easy Apply tailors resumes by pulling from your background.
              Before you generate anything, you need to give the AI something to work with.
            </p>
          </div>

          {/* The key insight */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 sm:p-8 text-center space-y-3">
            <Library className="w-9 h-9 text-amber-500 mx-auto" />
            <p className="text-lg sm:text-xl font-semibold text-foreground leading-snug">
              Your tailored resumes will only be as good as the experience you share with us.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-lg mx-auto">
              Think of it like briefing a professional resume writer — the more detail and context
              you give, the stronger and more accurate every resume will be. A thin experience
              library produces thin resumes.
            </p>
          </div>

          {/* How it flows */}
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground text-center">
              Here&apos;s how it works
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Library,
                  step: '1',
                  title: 'Build your library',
                  description:
                    'Upload your resume, paste past job descriptions, or let the AI interview you about your background.',
                  color: 'text-blue-500',
                  bg: 'bg-blue-500/10 border-blue-500/20',
                },
                {
                  icon: FileText,
                  step: '2',
                  title: 'Paste any job posting',
                  description:
                    'Drop in a URL or paste a job description. Easy Apply extracts the company, title, and requirements.',
                  color: 'text-violet-500',
                  bg: 'bg-violet-500/10 border-violet-500/20',
                },
                {
                  icon: Zap,
                  step: '3',
                  title: 'Generate in 60 seconds',
                  description:
                    'Get a tailored resume (and optional cover letter) written specifically for that role. Download as PDF.',
                  color: 'text-emerald-500',
                  bg: 'bg-emerald-500/10 border-emerald-500/20',
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className={`relative rounded-xl border p-5 ${item.bg}`}
                >
                  <span className="absolute top-3 right-3 text-[10px] font-bold text-muted-foreground/50 tracking-widest">
                    0{item.step}
                  </span>
                  <item.icon className={`w-6 h-6 mb-3 ${item.color}`} />
                  <p className="text-sm font-semibold text-foreground mb-1">{item.title}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="flex flex-col items-center gap-4 pt-2">
            <button
              onClick={onDismiss}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors text-base shadow-lg shadow-blue-600/25"
            >
              Add My Experience
              <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-xs text-muted-foreground">
              You can always add more experience later from{' '}
              <span className="font-medium text-foreground">My Experience</span>.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
