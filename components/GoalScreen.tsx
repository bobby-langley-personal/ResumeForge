'use client';

import Link from 'next/link';
import { Target, FileEdit, Plus, Brain, LayoutList, Diamond, ArrowRight } from 'lucide-react';

const SKIP_KEY = 'resumeforge_skip_goal_screen';

interface Props {
  firstName: string | null;
  hasApplications: boolean;
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

export default function GoalScreen({ firstName, hasApplications }: Props) {
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

      <div className="space-y-3">
        <GoalCard
          icon={<Target className="w-5 h-5 text-foreground" />}
          title="Tailor a resume for a specific job"
          description="Paste a job description and get a tailored resume in seconds"
          href="/tailor"
          cta="Tailor Now"
          primary
        />
        <GoalCard
          icon={<Diamond className="w-5 h-5 text-foreground" />}
          title="Create a polished general-use resume"
          description="A strong standalone resume for recruiters, networking, and broad applications"
          href="/polished-resume"
          cta="Create"
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
        <GoalCard
          icon={<FileEdit className="w-5 h-5 text-foreground" />}
          title="Manage my experience"
          description="Upload, edit, or organize your saved experience and context files"
          href="/resumes"
          cta="Open"
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
