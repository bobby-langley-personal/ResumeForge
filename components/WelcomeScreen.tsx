'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, ChevronDown, Loader2, ArrowRight, Lightbulb, Check } from 'lucide-react';

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

interface ContactFields {
  fullName: string;
  email: string;
  location: string;
  linkedinUrl: string;
}

async function extractContactFromText(text: string): Promise<ContactFields> {
  try {
    const res = await fetch('/api/extract-contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error('extraction failed');
    const data = await res.json();
    return {
      fullName: data.full_name ?? '',
      email: data.email ?? '',
      location: data.location ?? '',
      linkedinUrl: data.linkedin_url ?? '',
    };
  } catch {
    return { fullName: '', email: '', location: '', linkedinUrl: '' };
  }
}

export default function WelcomeScreen() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload step state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);

  // Contact step state
  const [showContact, setShowContact] = useState(false);
  const [isExtractingContact, setIsExtractingContact] = useState(false);
  const [contact, setContact] = useState<ContactFields>({ fullName: '', email: '', location: '', linkedinUrl: '' });
  const [isSavingContact, setIsSavingContact] = useState(false);
  const [contactError, setContactError] = useState('');

  const processFile = async (file: File) => {
    setIsUploading(true);
    setUploadError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/extract-resume', { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      const { text, fileName } = await res.json();

      // Save resume to library
      const title = fileName.replace(/\.[^.]+$/, '');
      await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: { text, fileName }, item_type: 'resume', is_default: true }),
      });

      // Show the contact verification form immediately, then populate it
      setIsExtractingContact(true);
      setShowContact(true);
      extractContactFromText(text).then(extracted => {
        setContact(extracted);
        setIsExtractingContact(false);
      });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (isUploading) return;
    const file = e.dataTransfer.files[0];
    if (!file) return;
    if (!file.name.match(/\.(pdf|docx)$/i)) {
      setUploadError('Please upload a PDF or DOCX file');
      return;
    }
    processFile(file);
  };

  const handleSaveContact = async () => {
    setIsSavingContact(true);
    setContactError('');
    try {
      await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: contact.fullName,
          email: contact.email,
          location: contact.location,
          linkedin_url: contact.linkedinUrl,
        }),
      });
      router.push('/tailor');
    } catch {
      setContactError('Failed to save. Please try again.');
      setIsSavingContact(false);
    }
  };

  // ── Contact confirmation step ──────────────────────────────────────────────
  if (showContact) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Let&apos;s make sure we&apos;ve got the right info</h2>
          <p className="text-sm text-muted-foreground mt-1">
            We pulled this from your resume. Make sure it&apos;s up to date — it will appear on all generated documents. You can update it any time under <strong>My Experience</strong>.
          </p>
        </div>

        {isExtractingContact ? (
          <div className="flex items-center gap-2 py-8 justify-center text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Reading your resume…</span>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Full name</Label>
              <Input
                value={contact.fullName}
                onChange={e => setContact(c => ({ ...c, fullName: e.target.value }))}
                placeholder="Jane Smith"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                type="email"
                value={contact.email}
                onChange={e => setContact(c => ({ ...c, email: e.target.value }))}
                placeholder="jane@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={contact.location}
                onChange={e => setContact(c => ({ ...c, location: e.target.value }))}
                placeholder="San Francisco, CA"
              />
            </div>
            <div className="space-y-1.5">
              <Label>LinkedIn URL</Label>
              <Input
                value={contact.linkedinUrl}
                onChange={e => setContact(c => ({ ...c, linkedinUrl: e.target.value }))}
                placeholder="linkedin.com/in/yourname"
              />
            </div>
          </div>
        )}

        {contactError && <p className="text-sm text-destructive">{contactError}</p>}

        <div className="flex items-center gap-3">
          <Button
            className="flex-1"
            onClick={handleSaveContact}
            disabled={isSavingContact || isExtractingContact}
          >
            {isSavingContact
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              : <><Check className="w-4 h-4 mr-2" />Looks good, save &amp; continue</>}
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/tailor')}
            disabled={isSavingContact || isExtractingContact}
          >
            Skip for now
          </Button>
        </div>
      </div>
    );
  }

  // ── Upload step ────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Let&apos;s build your Experience Library</h2>
        <p className="text-sm text-muted-foreground mt-1">
          This is where the AI draws from when tailoring your resume. The more context you add, the better every output gets.
        </p>
      </div>

      {/* Primary upload card */}
      <div
        className={`border-2 rounded-xl p-5 transition-colors ${
          isDragOver
            ? 'border-primary bg-primary/10'
            : 'border-primary/40 bg-primary/5'
        }`}
        onDragOver={(e) => { e.preventDefault(); if (!isUploading) setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
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
              <Upload className={`w-5 h-5 ${isDragOver ? 'text-primary' : 'text-foreground'}`} />
            </div>
            <div>
              <p className="font-medium text-foreground">
                {isDragOver ? 'Drop to upload' : 'Upload your resume'}
              </p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {isDragOver
                  ? 'Release to add this file to your Experience Library'
                  : 'Drag and drop or click Upload — PDF or DOCX'}
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
        {uploadError && <p className="text-sm text-destructive mt-3">{uploadError}</p>}
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
