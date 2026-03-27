'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Send, RotateCcw, MessageCircle, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ResumeItem } from '@/types/resume';
import { useUser } from '@clerk/nextjs';

const InlinePDFViewer = dynamic(() => import('@/components/InlinePDFViewer'), { ssr: false });

type Step = 'select' | 'generating' | 'review';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'change' | 'answer';
}

const QUICK_ACTIONS = [
  { label: 'Add summary',     prompt: 'Add a strong 2-3 sentence professional summary at the top' },
  { label: 'Tighten bullets', prompt: 'Tighten the language throughout — remove weak verbs and passive voice' },
  { label: 'Fit to 2 pages',  prompt: 'Trim this resume to fit cleanly on two pages without losing key content. Tell me what you changed.' },
  { label: 'More detail',     prompt: 'Expand the bullet points with more specific metrics and achievements' },
];

interface Props {
  sourceDocuments: ResumeItem[];
  existingBaseResume: ResumeItem | null;
  editItem: ResumeItem | null;
}

export default function BaseResumeCreator({ sourceDocuments, existingBaseResume, editItem }: Props) {
  const router = useRouter();
  const { user } = useUser();
  const candidateName = user?.fullName ?? user?.firstName ?? '';

  // If in edit mode, start at review with existing text
  const [step, setStep] = useState<Step>(editItem ? 'review' : 'select');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(sourceDocuments.filter(d => d.item_type === 'resume' || d.item_type === 'other').map(d => d.id))
  );
  const [resumeText, setResumeText] = useState(editItem?.content.text ?? '');
  const [showTextarea, setShowTextarea] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [genError, setGenError] = useState('');
  const [genProgress, setGenProgress] = useState('');

  // Chat state
  const [chatExpanded, setChatExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Your base resume is ready. Ask me to refine any section, add detail to a role, adjust bullet points, or make any other changes.', type: 'answer' },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatHistoryRef = useRef<ChatMessage[]>([]);

  const toggleDoc = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGenerate = async () => {
    if (!selectedIds.size) return;
    setStep('generating');
    setGenError('');
    setGenProgress('Reading your documents…');

    try {
      await new Promise(r => setTimeout(r, 600));
      setGenProgress('Extracting experience…');
      await new Promise(r => setTimeout(r, 400));
      setGenProgress('Writing your base resume…');

      const res = await fetch('/api/generate-base-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedIds) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { resumeText: generated } = await res.json();
      setResumeText(generated);
      setStep('review');
    } catch (err) {
      setGenError(err instanceof Error ? err.message : 'Generation failed. Please try again.');
      setStep('select');
    }
  };

  const handleSend = async (overridePrompt?: string) => {
    const msg = overridePrompt ?? chatInput.trim();
    if (!msg || chatLoading) return;
    setChatInput('');
    setChatLoading(true);

    const userMsg: ChatMessage = { role: 'user', content: msg };
    setMessages(prev => [...prev, userMsg]);
    chatHistoryRef.current = [...chatHistoryRef.current, userMsg];

    try {
      const res = await fetch('/api/base-resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resumeText,
          message: msg,
          chatHistory: chatHistoryRef.current.slice(-10),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as { type: 'change' | 'answer'; content: string };

      const assistantMsg: ChatMessage = { role: 'assistant', content: data.content, type: data.type };
      setMessages(prev => [...prev, assistantMsg]);
      chatHistoryRef.current = [...chatHistoryRef.current, assistantMsg];

      if (data.type === 'change') {
        setResumeText(data.content);
        setSaved(false);
      }
    } catch (err) {
      const errMsg: ChatMessage = { role: 'assistant', content: 'Something went wrong. Please try again.', type: 'answer' };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSave = async () => {
    if (!resumeText.trim()) return;
    setSaving(true);
    try {
      const isUpdate = editItem?.item_type === 'base_resume';
      if (isUpdate && editItem) {
        await fetch(`/api/resumes/${editItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Base Resume',
            content: { text: resumeText },
            item_type: 'base_resume',
            is_default: true,
          }),
        });
      } else {
        await fetch('/api/resumes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Base Resume',
            content: { text: resumeText },
            item_type: 'base_resume',
            is_default: true,
          }),
        });
      }
      setSaved(true);
      setTimeout(() => router.push('/resumes'), 1000);
    } catch {
      // stay on page if save fails
    } finally {
      setSaving(false);
    }
  };

  // ── Select step ───────────────────────────────────────────────
  if (step === 'select') {
    return (
      <div className="max-w-xl mx-auto space-y-6">
        <Link href="/resumes" className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to My Profile
        </Link>

        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">
            {existingBaseResume ? 'Rebuild Your Base Resume' : 'Create Your Base Resume'}
          </h2>
          <p className="text-sm text-muted-foreground">
            We&apos;ll build your master resume from your uploaded experience. Which documents should we use?
          </p>
        </div>

        {genError && <p className="text-sm text-destructive">{genError}</p>}

        {sourceDocuments.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <p className="text-muted-foreground">No documents found. Upload your resume first.</p>
            <Link href="/resumes"><Button variant="outline">Go to My Profile</Button></Link>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {sourceDocuments.map(doc => (
                <label key={doc.id} className="flex items-center gap-3 p-3.5 border border-border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleDoc(doc.id)}
                    className="w-4 h-4 accent-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.title}</p>
                    <p className="text-xs text-muted-foreground">{doc.item_type.replace('_', ' ')}</p>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  const allIds = sourceDocuments.map(d => d.id);
                  setSelectedIds(selectedIds.size === allIds.length ? new Set() : new Set(allIds));
                }}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {selectedIds.size === sourceDocuments.length ? 'Deselect all' : 'Select all'}
              </button>
              <Button onClick={handleGenerate} disabled={!selectedIds.size}>
                Continue →
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  // ── Generating step ───────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="max-w-xl mx-auto flex flex-col items-center justify-center py-24 space-y-6">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <div className="text-center space-y-1">
          <p className="font-medium text-foreground">{genProgress}</p>
          <p className="text-sm text-muted-foreground">This takes about 20–30 seconds</p>
        </div>
      </div>
    );
  }

  // ── Review step ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Your Base Resume</h2>
          {editItem
            ? <p className="text-sm text-muted-foreground mt-0.5">Make any changes, then save</p>
            : <p className="text-sm text-muted-foreground mt-0.5">Review, refine, and save as your master resume</p>
          }
        </div>
        <Button onClick={handleSave} disabled={saving || saved}>
          {saved
            ? <><Check className="w-4 h-4 mr-2" />Saved!</>
            : saving
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              : <><Check className="w-4 h-4 mr-2" />Save as Base Resume</>
          }
        </Button>
      </div>

      {/* PDF preview / textarea toggle */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-foreground">Resume Preview</span>
          <button
            onClick={() => setShowTextarea(v => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showTextarea ? 'Show PDF' : 'Edit text'}
          </button>
        </div>
        {showTextarea ? (
          <Textarea
            value={resumeText}
            onChange={e => { setResumeText(e.target.value); setSaved(false); }}
            className="min-h-[500px] font-mono text-sm bg-background"
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

      {/* Chat panel */}
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setChatExpanded(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
        >
          <span className="flex items-center gap-2"><MessageCircle className="w-4 h-4" /> Refine with AI</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${chatExpanded ? 'rotate-180' : ''}`} />
        </button>

        {chatExpanded && (
          <div className="border-t border-border">
            {/* Quick actions */}
            <div className="flex gap-2 flex-wrap p-4 pb-0">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  onClick={() => handleSend(a.prompt)}
                  disabled={chatLoading}
                  className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                >
                  {a.label}
                </button>
              ))}
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] text-sm px-3.5 py-2.5 rounded-xl ${
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : m.type === 'change'
                        ? 'bg-green-500/10 text-foreground border border-green-500/20'
                        : 'bg-muted text-foreground'
                  }`}>
                    {m.type === 'change' && <p className="text-xs text-green-600 mb-1 font-medium">✓ Resume updated</p>}
                    <p className="whitespace-pre-wrap">{m.type === 'change' ? 'Resume updated. Review the changes above.' : m.content}</p>
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-2 justify-start">
                  <div className="bg-muted px-3.5 py-2.5 rounded-xl">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 pt-0 flex gap-2">
              <Textarea
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Ask me to refine anything…"
                className="min-h-[44px] max-h-32 text-sm resize-none bg-background"
                disabled={chatLoading}
              />
              <Button size="sm" onClick={() => handleSend()} disabled={!chatInput.trim() || chatLoading} className="shrink-0 h-11">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        {!editItem && (
          <button onClick={() => setStep('select')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <RotateCcw className="w-3.5 h-3.5" /> Regenerate
          </button>
        )}
        <div className="ml-auto">
          <Button onClick={handleSave} disabled={saving || saved} size="lg">
            {saved
              ? <><Check className="w-4 h-4 mr-2" />Saved!</>
              : saving
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
                : <><Check className="w-4 h-4 mr-2" />Save as Base Resume</>
            }
          </Button>
        </div>
      </div>
    </div>
  );
}
