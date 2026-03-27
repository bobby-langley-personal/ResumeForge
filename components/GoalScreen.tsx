'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, FileEdit, Plus, Brain, LayoutList, ArrowRight, X } from 'lucide-react';

const SKIP_KEY = 'resumeforge_skip_goal_screen';

interface Props {
  firstName: string | null;
  hasBaseResume: boolean;
  hasApplications: boolean;
  baseResumeStale: boolean;
  baseResumeDaysOld: number;
}

function GoalCard({
  icon,
  title,
  description,
  href,
  cta,
  primary,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  href: string;
  cta: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-start justify-between gap-4 border rounded-xl p-5 transition-colors group ${
        primary
          ? 'border-primary/40 hover:border-primary bg-primary/5'
          : 'border-border hover:border-primary/50'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">{icon}</div>
        <div>
          <p className="font-medium text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
      <span className={`shrink-0 flex items-center gap-1 text-sm font-medium transition-colors whitespace-nowrap mt-1 ${primary ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`}>
        {cta} <ArrowRight className="w-3.5 h-3.5" />
      </span>
    </Link>
  );
}

function StaleBanner({ daysOld }: { daysOld: number }) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="flex items-start gap-3 p-4 border border-blue-500/30 bg-blue-500/5 rounded-xl text-sm">
      <span className="text-blue-400 mt-0.5 shrink-0">💡</span>
      <div className="flex-1">
        <span className="text-foreground font-medium">Your base resume was last updated {daysOld} days ago. </span>
        <span className="text-muted-foreground">Keep it current for the best tailored results. </span>
        <Link href="/resumes" className="text-primary hover:underline font-medium">Update Now →</Link>
      </div>
      <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

export default function GoalScreen({
  firstName,
  hasBaseResume,
  hasApplications,
  baseResumeStale,
  baseResumeDaysOld,
}: Props) {
  const handleSkip = () => {
    localStorage.setItem(SKIP_KEY, 'true');
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">
          Welcome back{firstName ? `, ${firstName}` : ''}. What would you like to do?
        </h2>
      </div>

      {/* State 2 banner — has docs but no base resume */}
      {!hasBaseResume && (
        <div className="flex items-start gap-3 p-4 border border-amber-500/40 bg-amber-500/5 rounded-xl text-sm">
          <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
          <div className="flex-1">
            <span className="text-foreground font-medium">You haven&apos;t set a base resume yet. </span>
            <span className="text-muted-foreground">Your tailored resumes will be stronger with one. </span>
            <Link href="/resumes" className="text-primary hover:underline font-medium">Set one in My Documents →</Link>
          </div>
        </div>
      )}

      {/* State 3 banner — base resume is stale */}
      {hasBaseResume && baseResumeStale && (
        <StaleBanner daysOld={baseResumeDaysOld} />
      )}

      <div className="space-y-3">
        <GoalCard
          icon={<Target className="w-5 h-5 text-foreground" />}
          title="Tailor a resume for a specific job"
          description="Paste a job description and get a tailored, ATS-optimized resume in seconds"
          href="/tailor"
          cta="Tailor Now"
          primary
        />
        <GoalCard
          icon={<FileEdit className="w-5 h-5 text-foreground" />}
          title="Update your base resume"
          description="Refine the master profile that all your tailored resumes are built from"
          href="/resumes"
          cta="Update"
        />
        <GoalCard
          icon={<Plus className="w-5 h-5 text-foreground" />}
          title="Add more experience"
          description="Upload new docs or interview with AI to strengthen your profile"
          href="/interview"
          cta="Add More"
        />
        {hasApplications && (
          <GoalCard
            icon={<Brain className="w-5 h-5 text-foreground" />}
            title="Prep for an interview"
            description="Get tailored questions and answer hints for a role you've already applied to"
            href="/dashboard"
            cta="Prep Now"
          />
        )}
        <GoalCard
          icon={<LayoutList className="w-5 h-5 text-foreground" />}
          title="View my applications"
          description="See past tailored resumes and re-download anytime"
          href="/dashboard"
          cta="View"
        />
      </div>

      <p className="text-center text-xs text-muted-foreground pt-2">
        <Link
          href="/tailor"
          onClick={handleSkip}
          className="hover:text-foreground transition-colors underline underline-offset-2"
        >
          Skip to generation
        </Link>
        {' '}— we&apos;ll remember your preference
      </p>
    </div>
  );
}
