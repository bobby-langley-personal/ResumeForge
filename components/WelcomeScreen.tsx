'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Upload, ChevronDown, Loader2, ArrowRight, Lightbulb } from 'lucide-react';

interface WhatToAddTip {
  icon: string;
  title: string;
  body: string;
}

const WHAT_TO_ADD: WhatToAddTip[] = [
  {
    icon: '📄',
    title: 'LinkedIn Profile Export',
    body: 'Go to linkedin.com → View Profile → More → Save to PDF. This gives the AI your complete work history, skills, and accomplishments in one go — often more detailed than a standard resume.',
  },
  {
    icon: '📝',
    title: 'Expanded Work History',
    body: "A brain-dump of everything you've done at each job — projects, tools, metrics, cross-functional work. Don't worry about formatting. The AI cherry-picks what's most relevant for each application. You can also build this with the AI Experience Interview.",
  },
  {
    icon: '💌',
    title: 'Cover Letter Samples',
    body: "Past cover letters you're proud of. The AI uses them to match your tone and writing style when generating new ones — it won't copy them verbatim.",
  },
  {
    icon: '🏆',
    title: 'Portfolio or Project Work',
    body: 'A summary doc describing side projects, GitHub work, or work samples — project name, tech used, your role, and outcomes. Even a bullet-point list works.',
  },
  {
    icon: '📊',
    title: 'Performance Reviews or Feedback',
    body: "Past reviews contain specific language about your impact you might not think to include. Copy the text in, remove anything sensitive, and the AI will draw on it for bullet points.",
  },
];

function TipRow({ tip }: { tip: WhatToAddTip }) {
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
          <p className="px-4 pb-4 pt-2 border-t border-border text-sm text-muted-foreground">
            {tip.body}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function WelcomeScreen() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const [tipsOpen, setTipsOpen] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-resume', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const { text, fileName } = await res.json();
      const title = fileName.replace(/\.[^.]+$/, '');
      await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: { text, fileName }, item_type: 'resume', is_default: true }),
      });
      router.push('/tailor');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
      setIsUploading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Let&apos;s build your Experience Library</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is where the AI draws from when tailoring your resume. The more context you add, the better every output gets.
        </p>
      </div>

      {/* Primary upload card */}
      <div className="border border-primary/40 bg-primary/5 rounded-xl p-5">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
              <Upload className="w-5 h-5 text-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">Upload your resume</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload one or more of your most recent resumes to start — PDF or DOCX
              </p>
            </div>
          </div>
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="shrink-0"
          >
            {isUploading
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <>Upload <ArrowRight className="w-3.5 h-3.5 ml-1.5" /></>}
          </Button>
        </div>
        {error && <p className="text-sm text-destructive mt-3">{error}</p>}
      </div>

      {/* What else can I add? */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setTipsOpen(v => !v)}
          className="flex items-center justify-between w-full px-5 py-4 text-left hover:bg-muted/30 transition-colors"
        >
          <span className="flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-yellow-500" />
            <span className="text-sm font-medium text-foreground">What else can I add?</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            {tipsOpen ? 'Hide' : 'Show ideas'}
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${tipsOpen ? 'rotate-180' : ''}`}
            />
          </span>
        </button>
        <div className={`grid transition-all duration-200 ${tipsOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
          <div className="overflow-hidden">
            <div className="px-5 pb-5 pt-1 border-t border-border space-y-2">
              {WHAT_TO_ADD.map(tip => (
                <TipRow key={tip.title} tip={tip} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Negative path */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have a resume?{' '}
        <Link
          href="/interview"
          className="text-foreground font-medium hover:text-primary transition-colors underline underline-offset-2"
        >
          Let&apos;s make one with AI <ArrowRight className="w-3.5 h-3.5 inline -mt-0.5" />
        </Link>
      </p>
    </div>
  );
}
