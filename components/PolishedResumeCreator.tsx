'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ResumeItem, ITEM_TYPE_LABELS } from '@/types/resume';
import { Diamond, ArrowLeft, ArrowRight, Loader2, MessageSquare, Send, Download } from 'lucide-react';
import { MarkdownText } from '@/lib/render-markdown';

const InlinePDFViewer = dynamic(() => import('@/components/InlinePDFViewer'), { ssr: false });

type Step = 'select' | 'configure' | 'generating' | 'review';

interface ChatMessage {
  role: 'user' | 'assistant';
  type?: 'change' | 'answer';
  content: string;
}

interface Props {
  sourceDocuments: ResumeItem[];
}

const QUICK_ACTIONS = [
  'Make it more concise',
  'Strengthen the summary',
  'Tighten bullet points',
  'Make bullets more impactful',
];

export default function PolishedResumeCreator({ sourceDocuments }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const candidateName = user?.fullName ?? user?.firstName ?? '';

  const [step, setStep] = useState<Step>('select');

  // Select step
  const defaultSelected = new Set(
    sourceDocuments.filter(d => d.item_type === 'resume' || d.item_type === 'other').map(d => d.id)
  );
  const [selectedIds, setSelectedIds] = useState<Set<string>>(defaultSelected);

  // Configure step
  const [pageLimit, setPageLimit] = useState<1 | 2 | number>(2);
  const [customPages, setCustomPages] = useState('');
  const [pageChoice, setPageChoice] = useState<'1' | '2' | 'custom'>('2');
  const [roleTypeHint, setRoleTypeHint] = useState('');

  // Review step
  const [resumeText, setResumeText] = useState('');
  const [showTextEdit, setShowTextEdit] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const [chatError, setChatError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Save step
  const [isSaving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveName, setSaveName] = useState(() => {
    const month = new Date().toLocaleString('en-US', { month: 'long' });
    const year = new Date().getFullYear();
    return `Polished Resume — ${month} ${year}`;
  });
  const [showSaveOptions, setShowSaveOptions] = useState(false);

  const toggleDoc = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resolvedPageLimit = (): number => {
    if (pageChoice === '1') return 1;
    if (pageChoice === '2') return 2;
    const n = parseInt(customPages, 10);
    return isNaN(n) ? 2 : Math.min(Math.max(n, 1), 4);
  };

  const handleGenerate = async () => {
    const limit = resolvedPageLimit();
    setPageLimit(limit);
    setStep('generating');

    try {
      const res = await fetch('/api/generate-polished-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentIds: Array.from(selectedIds),
          pageLimit: limit,
          roleTypeHint: roleTypeHint.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResumeText(data.resumeText);
      setStep('review');
    } catch (err) {
      console.error('[polished-resume generate]', err);
      setStep('configure');
    }
  };

  const sendChat = async (message: string) => {
    if (!message.trim() || isChatting) return;
    setChatInput('');
    setChatError('');
    setIsChatting(true);

    const userMsg: ChatMessage = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await fetch('/api/base-resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          message,
          chatHistory: chatMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { type: 'change' | 'answer'; content: string; summary?: string };

      if (data.type === 'change' && data.content) {
        setResumeText(data.content);
      }

      setChatMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          type: data.type,
          content: data.type === 'change' ? (data.summary ?? 'Resume updated.') : data.content,
        },
      ]);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setIsChatting(false);
    }
  };

  const handleSave = async (saveType: 'my_documents' | 'base_resume') => {
    if (!resumeText.trim()) return;
    setSaving(true);
    setSaveError('');

    try {
      const body = {
        title: saveName.trim() || 'Polished Resume',
        content: { text: resumeText },
        item_type: saveType === 'base_resume' ? 'base_resume' : 'resume',
        is_default: saveType === 'base_resume',
      };
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/resumes');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadOnly = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/download-pdf/polished', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText, fileName: saveName.trim() || 'Polished_Resume' }),
      });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cd = res.headers.get('Content-Disposition');
      a.download = cd?.match(/filename="(.+)"/)?.[1] || 'Polished_Resume.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setSaving(false);
    }
  };

  // ─── Select Step ────────────────────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Diamond className="w-5 h-5 text-primary" />
            Create a Polished Resume
          </h2>
          <p className="text-sm text-muted-foreground">
            Select your experience files to build from. We&apos;ll generate a strong, standalone resume ready to send.
          </p>
        </div>

        {sourceDocuments.length === 0 ? (
          <div className="p-6 border border-dashed border-border rounded-xl text-center space-y-3">
            <p className="text-muted-foreground">No experience files found.</p>
            <Link href="/resumes"><Button>Add to My Experience →</Button></Link>
          </div>
        ) : (
          <div className="space-y-2">
            {sourceDocuments.map(doc => (
              <label key={doc.id} className="flex items-center gap-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/30 transition-colors">
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => toggleDoc(doc.id)}
                  className="w-4 h-4 accent-primary"
                />
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-sm text-foreground">{doc.title}</span>
                  <span className="ml-2 text-xs text-muted-foreground">· {ITEM_TYPE_LABELS[doc.item_type]}</span>
                </div>
              </label>
            ))}
          </div>
        )}

        <Button
          className="w-full"
          disabled={selectedIds.size === 0}
          onClick={() => setStep('configure')}
        >
          Continue <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ─── Configure Step ──────────────────────────────────────────────────────────
  if (step === 'configure') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <div>
          <button onClick={() => setStep('select')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
            <Diamond className="w-5 h-5 text-primary" />
            A couple quick questions
          </h2>
        </div>

        {/* Page limit */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">How many pages?</Label>
          <div className="space-y-2">
            {[
              { value: '1', label: '1 page', hint: 'Concise — great for early career or executive summaries' },
              { value: '2', label: '2 pages', hint: 'Recommended for 3+ years of experience' },
              { value: 'custom', label: 'Custom', hint: '' },
            ].map(opt => (
              <label key={opt.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="pages"
                  value={opt.value}
                  checked={pageChoice === opt.value}
                  onChange={() => setPageChoice(opt.value as typeof pageChoice)}
                  className="mt-0.5 accent-primary"
                />
                <div>
                  <span className="text-sm font-medium text-foreground">{opt.label}</span>
                  {opt.hint && <span className="text-xs text-muted-foreground ml-2">({opt.hint})</span>}
                  {opt.value === 'custom' && pageChoice === 'custom' && (
                    <Input
                      type="number"
                      min={1}
                      max={4}
                      placeholder="2"
                      value={customPages}
                      onChange={e => setCustomPages(e.target.value)}
                      className="mt-1.5 w-24 h-8 text-sm"
                      autoFocus
                    />
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Role type hint */}
        <div className="space-y-2">
          <Label htmlFor="roleHint" className="text-sm font-medium">
            What type of roles are you targeting?{' '}
            <span className="text-xs text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="roleHint"
            placeholder="e.g. Software Engineer, Customer Success, Product Manager…"
            value={roleTypeHint}
            onChange={e => setRoleTypeHint(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Helps the AI prioritize the most relevant experience.</p>
        </div>

        <Button className="w-full" onClick={handleGenerate}>
          Generate My Resume <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ─── Generating Step ─────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center py-20 space-y-6 text-center">
        <Diamond className="w-10 h-10 text-primary animate-pulse" />
        <div>
          <h2 className="text-xl font-semibold text-foreground">Building your polished resume…</h2>
          <p className="text-sm text-muted-foreground mt-1">Ordering bullets by impact and fitting to {pageLimit} page{pageLimit > 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-primary animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Review Step ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Diamond className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">
            Polished Resume
            {roleTypeHint && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">· {roleTypeHint}</span>
            )}
          </h2>
        </div>
        <span className="text-xs text-muted-foreground">~{pageLimit} page{pageLimit > 1 ? 's' : ''}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF / text preview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-foreground">Preview</span>
            <button
              onClick={() => setShowTextEdit(v => !v)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {showTextEdit ? 'PDF view' : 'Edit text'}
            </button>
          </div>
          {showTextEdit ? (
            <Textarea
              value={resumeText}
              onChange={e => setResumeText(e.target.value)}
              className="min-h-[600px] font-mono text-sm bg-muted resize-y"
            />
          ) : (
            <InlinePDFViewer
              type="resume"
              text={resumeText}
              candidateName={candidateName}
              company=""
              jobTitle=""
            />
          )}
        </div>

        {/* Chat + save */}
        <div className="space-y-4">
          {/* Quick actions */}
          <div className="flex flex-wrap gap-2">
            {QUICK_ACTIONS.map(action => (
              <button
                key={action}
                type="button"
                onClick={() => sendChat(action)}
                disabled={isChatting}
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                {action}
              </button>
            ))}
          </div>

          {/* Chat messages */}
          {chatMessages.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-lg ${msg.role === 'user' ? 'bg-muted ml-8' : 'bg-primary/5 border border-primary/20 mr-8'}`}>
                  {msg.role === 'assistant' && msg.type === 'change' && (
                    <span className="text-xs text-green-500 font-semibold block mb-1">✓ Resume updated</span>
                  )}
                  {msg.role === 'assistant'
                    ? <MarkdownText text={msg.content} className="text-muted-foreground space-y-1.5" />
                    : <p className="text-muted-foreground">{msg.content}</p>
                  }
                </div>
              ))}
              {isChatting && (
                <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 border border-primary/20 rounded-lg mr-8">
                  <Loader2 className="w-3 h-3 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">Thinking…</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {/* Chat input */}
          <div className="flex gap-2">
            <Input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendChat(chatInput))}
              placeholder="Ask for changes or ask a question…"
              disabled={isChatting}
              className="text-sm"
            />
            <Button
              type="button"
              size="sm"
              onClick={() => sendChat(chatInput)}
              disabled={!chatInput.trim() || isChatting}
              className="shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          {chatError && <p className="text-xs text-destructive">{chatError}</p>}

          {/* Save options */}
          <div className="border-t border-border pt-4 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="saveName" className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Name
              </Label>
              <Input
                id="saveName"
                value={saveName}
                onChange={e => setSaveName(e.target.value)}
                className="text-sm"
              />
            </div>

            {!showSaveOptions ? (
              <Button className="w-full" onClick={() => setShowSaveOptions(true)}>
                Save &amp; Download
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground font-medium">Save as…</p>
                <Button
                  className="w-full"
                  onClick={() => handleSave('my_documents')}
                  disabled={isSaving}
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save to My Experience
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSave('base_resume')}
                  disabled={isSaving}
                >
                  Save as Base Resume
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={handleDownloadOnly}
                  disabled={isSaving}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Just download — don&apos;t save
                </Button>
              </div>
            )}

            {saveError && <p className="text-xs text-destructive">{saveError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
