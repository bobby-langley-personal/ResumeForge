'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Lightbulb, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TipsPanelProps {
  onUpload: () => void;
}

interface Tip {
  icon: string;
  title: string;
  body: React.ReactNode;
}

const TIPS: Tip[] = [
  {
    icon: '📄',
    title: 'LinkedIn Profile Export',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Export your full LinkedIn profile as a PDF and upload it — this gives the AI your complete
          work history, skills, and accomplishments in one go.
        </p>
        <div>
          <p className="font-medium text-foreground mb-1">How to export:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Go to linkedin.com and sign in</li>
            <li>Click your profile picture → "View Profile"</li>
            <li>Click the "More" button below your name</li>
            <li>Select "Save to PDF"</li>
            <li>Upload the downloaded PDF to ResumeForge using the "Add New" button</li>
          </ol>
        </div>
        <div>
          <p className="font-medium text-foreground mb-1">Why this works well:</p>
          <p>
            LinkedIn profiles typically contain your full work history, skills endorsements, and
            accomplishments — much more detail than a standard resume. The AI uses all of it.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: '📝',
    title: 'Expanded Work History',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Create a detailed document with everything you've ever done at each job — even things that
          didn't make it onto your resume. The AI will cherry-pick what's most relevant for each
          application.
        </p>
        <div>
          <p className="font-medium text-foreground mb-1">What to include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Every project you worked on, even small ones</li>
            <li>Specific tools, technologies, and platforms you used</li>
            <li>Metrics and outcomes where you remember them</li>
            <li>Awards, recognition, or notable feedback</li>
            <li>Cross-functional work and collaborations</li>
            <li>Things you built, fixed, or improved</li>
          </ul>
        </div>
        <p className="italic">
          Tip: Don't worry about formatting — just brain-dump everything into a document and upload
          it. The messier the better. The AI handles the rest.
        </p>
        <p>
          Want a guided way to build this?{' '}
          <Link href="/interview" className="text-primary underline underline-offset-2 hover:opacity-80">
            Use the AI Experience Interview
          </Link>{' '}
          — it walks you through each role with adaptive questions and generates a polished experience
          doc you can save directly to My Documents.
        </p>
      </div>
    ),
  },
  {
    icon: '💌',
    title: 'Cover Letter Samples',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Upload past cover letters you're proud of so the AI can match your tone and style.
        </p>
        <div>
          <p className="font-medium text-foreground mb-1">How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Find a cover letter you've written that felt authentic</li>
            <li>Save it as a PDF or copy the text</li>
            <li>Upload or paste it into ResumeForge</li>
            <li>When generating, select it in "Additional context"</li>
          </ol>
        </div>
        <p>
          The AI won't copy your old cover letter — it uses it to understand your voice and writing
          style.
        </p>
      </div>
    ),
  },
  {
    icon: '🏆',
    title: 'Portfolio or Project Work',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Have side projects, a GitHub portfolio, or work samples? Add a summary document describing
          them.
        </p>
        <div>
          <p className="font-medium text-foreground mb-1">What to include:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Project name and what it does</li>
            <li>Technologies used</li>
            <li>Your specific role and contributions</li>
            <li>Outcomes or impact (users, revenue, time saved)</li>
            <li>Links if relevant</li>
          </ul>
        </div>
        <p>
          Even a bullet-point list works — the AI will reference it when the job description calls
          for relevant project experience.
        </p>
      </div>
    ),
  },
  {
    icon: '📊',
    title: 'Performance Reviews or Feedback',
    body: (
      <div className="space-y-3 text-sm text-muted-foreground">
        <p>
          Past performance reviews are gold for resume writing — they contain specific language about
          your impact that you might not think to include yourself.
        </p>
        <div>
          <p className="font-medium text-foreground mb-1">How to use:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Copy text from past reviews into a document</li>
            <li>Remove anything sensitive (manager names, salary info)</li>
            <li>Upload as additional context</li>
          </ul>
        </div>
        <p>
          The AI will draw on specific phrases and achievements from your reviews when writing bullet
          points.
        </p>
      </div>
    ),
  },
];

function TipAccordion({ tip, onUpload }: { tip: Tip; onUpload: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <span>{tip.icon}</span>
          <span>{tip.title}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <div className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-1 border-t border-border space-y-4">
            {tip.body}
            <Button size="sm" variant="outline" onClick={onUpload}>
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Upload a document
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TipsPanel({ onUpload }: TipsPanelProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  return (
    <div className="mt-8 border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setPanelOpen(v => !v)}
        className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-yellow-500" />
          <span className="text-sm font-medium text-foreground">Tips</span>
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          {panelOpen ? 'Hide' : 'Want better results? Show tips'}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${panelOpen ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      <div className={`grid transition-all duration-200 ${panelOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
        <div className="overflow-hidden">
          <div className="px-5 pb-5 pt-1 border-t border-border space-y-2">
            {TIPS.map(tip => (
              <TipAccordion key={tip.title} tip={tip} onUpload={onUpload} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
