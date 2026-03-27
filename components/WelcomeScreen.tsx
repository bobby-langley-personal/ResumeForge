'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Mic, PenLine, ArrowRight, Loader2 } from 'lucide-react';

type View = 'options' | 'write';

export default function WelcomeScreen() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<View>('options');
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [writeText, setWriteText] = useState('');
  const [error, setError] = useState('');

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

  const handleSaveWritten = async () => {
    if (!writeText.trim()) return;
    setIsSaving(true);
    setError('');
    try {
      await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'My Experience',
          content: { text: writeText.trim() },
          item_type: 'resume',
          is_default: true,
        }),
      });
      router.push('/tailor');
    } catch {
      setError('Failed to save. Please try again.');
      setIsSaving(false);
    }
  };

  if (view === 'write') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <button
            onClick={() => setView('options')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 flex items-center gap-1"
          >
            ← Back
          </button>
          <h2 className="text-2xl font-bold text-foreground mb-1">Paste your experience</h2>
          <p className="text-sm text-muted-foreground">
            This becomes your base profile — paste your work history, job titles, skills, anything relevant.
          </p>
        </div>
        <Textarea
          placeholder="Paste your resume or work history here..."
          className="min-h-[320px] bg-background"
          value={writeText}
          onChange={e => setWriteText(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          size="lg"
          className="w-full"
          disabled={!writeText.trim() || isSaving}
          onClick={handleSaveWritten}
        >
          {isSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : <>Save & Continue <ArrowRight className="w-4 h-4 ml-2" /></>}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-foreground mb-3">Welcome to ResumeForge</h2>
        <p className="text-muted-foreground">
          Before we can tailor your resume, we need to know about your experience.
          Let&apos;s get you set up — it only takes a few minutes.
        </p>
      </div>

      <div className="space-y-3">
        {/* Upload */}
        <div className="border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
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
                <p className="font-medium text-foreground">Upload your current resume</p>
                <p className="text-sm text-muted-foreground mt-0.5">The fastest way to get started — PDF or DOCX</p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="shrink-0"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Upload <ArrowRight className="w-3.5 h-3.5 ml-1" /></>}
            </Button>
          </div>
        </div>

        {/* AI Interview */}
        <div className="border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
                <Mic className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Build your experience with AI</p>
                <p className="text-sm text-muted-foreground mt-0.5">Answer questions about your work history and we&apos;ll create your profile</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push('/interview')}
              className="shrink-0"
            >
              Start <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>

        {/* Write yourself */}
        <div className="border border-border rounded-xl p-5 hover:border-primary/50 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-muted shrink-0">
                <PenLine className="w-5 h-5 text-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Write it yourself</p>
                <p className="text-sm text-muted-foreground mt-0.5">Paste your work history manually</p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setView('write')}
              className="shrink-0"
            >
              Write <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-destructive text-center">{error}</p>}
    </div>
  );
}
