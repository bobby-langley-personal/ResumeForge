'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowRight, SkipForward, Loader2, Copy, Check, BookOpen, FileText } from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface DisplayMessage {
  role: 'ai' | 'user';
  content: string; // CHOICES: line stripped out
}

interface ExistingDoc {
  id: string;
  title: string;
  content: { text: string };
}

interface CompletedRole {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  history: ChatMessage[];
}

type Step =
  | 'preloading'
  | 'draft-prompt'
  | 'doc-prompt'
  | 'intro'
  | 'role-setup'
  | 'researching'
  | 'research-confirm'
  | 'interview'
  | 'complete'
  | 'generating'
  | 'output';

interface InterviewDraft {
  savedAt: string;
  totalRoles: number;
  currentRoleIndex: number;
  completedRoles: CompletedRole[];
  company: string;
  jobTitle: string;
  startDate: string;
  endDate: string;
  researchSummary: string;
  history: ChatMessage[];
  displayMessages: DisplayMessage[];
  choices: string[];
  useExistingDocs: boolean;
  existingDocsContext: string;
  resumeStep: 'role-setup' | 'interview';
}

const DRAFT_KEY = 'resumeforge_interview_draft';

const ROLE_COUNT_OPTIONS = [1, 2, 3, 4, 5];

// ── Helpers ────────────────────────────────────────────────────────────────

function parseChoices(text: string): { display: string; choices: string[] } {
  const lines = text.split('\n');
  const choicesIndex = lines.findLastIndex(l => l.startsWith('CHOICES:'));
  if (choicesIndex === -1) return { display: text, choices: [] };

  const choicesLine = lines[choicesIndex];
  const choices = choicesLine
    .replace('CHOICES:', '')
    .split('|')
    .map(c => c.trim())
    .filter(Boolean);

  const display = lines
    .filter((_, i) => i !== choicesIndex)
    .join('\n')
    .trim();

  return { display, choices };
}

function defaultDocName() {
  const now = new Date();
  return `Experience Doc — ${now.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function InterviewClient() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('preloading');
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [useExistingDocs, setUseExistingDocs] = useState(false);
  const [existingDocsContext, setExistingDocsContext] = useState('');

  const [totalRoles, setTotalRoles] = useState(0);
  const [completedRoles, setCompletedRoles] = useState<CompletedRole[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [suggestedRoles, setSuggestedRoles] = useState<{ company: string; title: string; startDate: string; endDate: string }[]>([]);

  // Role setup
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [researchSummary, setResearchSummary] = useState('');
  const [researchConfirmed, setResearchConfirmed] = useState(false);
  const [clarification, setClarification] = useState('');
  const [showClarify, setShowClarify] = useState(false);

  // Interview chat
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [displayMessages, setDisplayMessages] = useState<DisplayMessage[]>([]);
  const [choices, setChoices] = useState<string[]>([]);
  const [thinking, setThinking] = useState(false);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Output
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [docName, setDocName] = useState(defaultDocName());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [displayMessages, thinking]);

  // Preload existing docs on mount; extract roles and check for saved draft in parallel
  useEffect(() => {
    fetch('/api/resumes')
      .then(r => r.json())
      .then((docs: ExistingDoc[]) => {
        setExistingDocs(docs ?? []);

        // Kick off role extraction in the background if docs exist
        if (docs?.length > 0) {
          fetch('/api/interview/extract-roles', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              documents: docs.map((d: ExistingDoc) => ({ title: d.title, text: d.content.text })),
            }),
          })
            .then(r => r.json())
            .then(data => { if (data.roles?.length) setSuggestedRoles(data.roles); })
            .catch(() => { /* non-fatal */ });
        }

        try {
          const raw = localStorage.getItem(DRAFT_KEY);
          if (raw) { setStep('draft-prompt'); return; }
        } catch { /* ignore */ }
        setStep(docs?.length > 0 ? 'doc-prompt' : 'intro');
      })
      .catch(() => setStep('intro'));
  }, []);

  // ── Draft helpers ──────────────────────────────────────────────────────────

  const saveDraft = () => {
    const draft: InterviewDraft = {
      savedAt: new Date().toISOString(),
      totalRoles,
      currentRoleIndex,
      completedRoles,
      company,
      jobTitle,
      startDate,
      endDate,
      researchSummary,
      history,
      displayMessages,
      choices,
      useExistingDocs,
      existingDocsContext,
      resumeStep: step === 'interview' ? 'interview' : 'role-setup',
    };
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
    router.push('/resumes');
  };

  const clearDraft = () => {
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
  };

  const restoreDraft = () => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (!raw) { setStep('intro'); return; }
      const draft: InterviewDraft = JSON.parse(raw);
      setTotalRoles(draft.totalRoles);
      setCurrentRoleIndex(draft.currentRoleIndex);
      setCompletedRoles(draft.completedRoles);
      setCompany(draft.company);
      setJobTitle(draft.jobTitle);
      setStartDate(draft.startDate);
      setEndDate(draft.endDate);
      setResearchSummary(draft.researchSummary);
      setHistory(draft.history);
      setDisplayMessages(draft.displayMessages);
      setChoices(draft.choices);
      setUseExistingDocs(draft.useExistingDocs);
      setExistingDocsContext(draft.existingDocsContext);
      setStep(draft.resumeStep);
    } catch {
      clearDraft();
      setStep('intro');
    }
  };

  const discardDraft = () => {
    clearDraft();
    setStep(existingDocs.length > 0 ? 'doc-prompt' : 'intro');
  };

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleUseExistingDocs = (use: boolean) => {
    if (use) {
      const context = existingDocs
        .map(d => `--- ${d.title} ---\n${d.content.text.slice(0, 2000)}`)
        .join('\n\n');
      setExistingDocsContext(context);
      setUseExistingDocs(true);
    }
    setStep('intro');
  };

  const startRoleSetup = (index: number) => {
    const suggested = suggestedRoles[index];
    setCompany(suggested?.company ?? '');
    setJobTitle(suggested?.title ?? '');
    setStartDate(suggested?.startDate ?? '');
    setEndDate(suggested?.endDate ?? '');
    setResearchSummary('');
    setResearchConfirmed(false);
    setClarification('');
    setShowClarify(false);
    setCurrentRoleIndex(index);
    setStep('role-setup');
  };

  const handleRoleContinue = async () => {
    if (!company.trim() || !jobTitle.trim()) return;
    setStep('researching');
    try {
      const res = await fetch('/api/interview/research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: company.trim(), title: jobTitle.trim() }),
      });
      const data = await res.json();
      setResearchSummary(data.summary ?? '');
    } catch {
      setResearchSummary('');
    }
    setStep('research-confirm');
  };

  const startInterview = async (confirmed: boolean, clarification?: string) => {
    setResearchConfirmed(confirmed);
    setHistory([]);
    setDisplayMessages([]);
    setChoices([]);
    setInput('');
    setStep('interview');

    // Kick off the first AI question
    const openingMessage = confirmed
      ? `Let's start. I've reviewed what I know about ${company}. Please ask me your first question about this role.`
      : `Let me clarify: ${clarification ?? "my role was different from the typical description"}. Please ask me your first question.`;

    await sendToAI(openingMessage, [], confirmed ? researchSummary : undefined);
  };

  const sendToAI = async (
    message: string,
    currentHistory: ChatMessage[],
    research?: string,
  ) => {
    setThinking(true);
    setChoices([]);

    const newHistory: ChatMessage[] = [...currentHistory, { role: 'user', content: message }];

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: currentHistory,
          systemContext: {
            currentRole: { company: company.trim(), title: jobTitle.trim() },
            companyResearch: research ?? (researchConfirmed ? researchSummary : undefined),
            existingDocuments: useExistingDocs ? existingDocsContext : undefined,
            rolesRemaining: totalRoles - currentRoleIndex,
          },
        }),
      });

      const data = await res.json();
      const rawResponse: string = data.response ?? '';
      const { display, choices: parsed } = parseChoices(rawResponse);

      const updatedHistory: ChatMessage[] = [
        ...newHistory,
        { role: 'assistant', content: rawResponse },
      ];

      setHistory(updatedHistory);
      setDisplayMessages(prev => {
        const base = message === prev[prev.length - 1]?.content
          ? prev
          : [...prev, { role: 'user' as const, content: message }];
        return [...base, { role: 'ai' as const, content: display }];
      });
      setChoices(parsed);
    } catch {
      setDisplayMessages(prev => [
        ...prev,
        { role: 'user', content: message },
        { role: 'ai', content: 'Something went wrong. Please try again.' },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || thinking) return;
    setInput('');
    setDisplayMessages(prev => [...prev, { role: 'user', content: trimmed }]);
    sendToAI(trimmed, history);
  };

  const handleChoice = (choice: string) => {
    if (thinking) return;
    if (choice === 'Move to next role') {
      finishRole();
      return;
    }
    setDisplayMessages(prev => [...prev, { role: 'user', content: choice }]);
    sendToAI(choice, history);
  };

  const finishRole = () => {
    const role: CompletedRole = {
      company: company.trim(),
      title: jobTitle.trim(),
      startDate: startDate.trim(),
      endDate: endDate.trim(),
      history,
    };
    const updated = [...completedRoles, role];
    setCompletedRoles(updated);

    if (currentRoleIndex + 1 < totalRoles) {
      startRoleSetup(currentRoleIndex + 1);
    } else {
      setStep('complete');
    }
  };

  const generate = async () => {
    setStep('generating');
    try {
      const res = await fetch('/api/interview/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: completedRoles.map(r => ({
            company: r.company,
            title: r.title,
            startDate: r.startDate,
            endDate: r.endDate,
            history: r.history,
          })),
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setGeneratedDoc(data.document);
      setStep('output');
    } catch {
      setStep('complete');
    }
  };

  const saveToDocuments = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const res = await fetch('/api/resumes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: docName.trim() || defaultDocName(),
          content: { text: generatedDoc },
          item_type: 'other',
          is_default: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      clearDraft();
      router.push('/resumes');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(generatedDoc);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Renders ────────────────────────────────────────────────────────────────

  if (step === 'preloading') {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'draft-prompt') {
    let draft: InterviewDraft | null = null;
    try { draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? ''); } catch { /* ignore */ }
    const savedDate = draft?.savedAt
      ? new Date(draft.savedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
      : null;

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="text-3xl">💾</div>
          <h2 className="text-xl font-bold text-foreground">Resume your interview?</h2>
          <p className="text-sm text-muted-foreground">
            You have a saved interview in progress
            {savedDate ? ` from ${savedDate}` : ''}.
          </p>
        </div>

        {draft && (
          <div className="bg-card border border-border rounded-xl p-4 space-y-1.5 text-sm">
            <p className="text-foreground font-medium">
              {draft.completedRoles.length} role{draft.completedRoles.length !== 1 ? 's' : ''} completed
              {draft.company ? ` · currently on ${draft.company}` : ''}
            </p>
            {draft.completedRoles.length > 0 && (
              <p className="text-muted-foreground text-xs">
                {draft.completedRoles.map(r => `${r.title} @ ${r.company}`).join(', ')}
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={restoreDraft} className="flex-1">
            Resume interview
          </Button>
          <Button variant="outline" onClick={discardDraft} className="flex-1">
            Start over
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'doc-prompt') {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="text-3xl">📄</div>
          <h2 className="text-xl font-bold text-foreground">
            We found {existingDocs.length} document{existingDocs.length !== 1 ? 's' : ''} in your library
          </h2>
          <p className="text-sm text-muted-foreground">
            Use these as a starting point? The interview will fill in gaps and capture what's missing.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          {existingDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-2 text-sm text-foreground">
              <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              {doc.title}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Button onClick={() => handleUseExistingDocs(true)} className="flex-1">
            Yes, use my documents
          </Button>
          <Button variant="outline" onClick={() => handleUseExistingDocs(false)} className="flex-1">
            Start from scratch
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-8">
        <div className="space-y-3">
          <div className="text-4xl">🎤</div>
          <h1 className="text-2xl font-bold text-foreground">Build Your Experience Document</h1>
          <p className="text-muted-foreground leading-relaxed">
            Most resumes undersell the candidate. This interview captures everything — the tools
            you use daily, the fires you've put out, the processes you quietly improved. Things
            you don't think to mention because they feel obvious. They're not.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">How many roles would you like to cover?</p>
          <div className="flex justify-center gap-2 flex-wrap">
            {ROLE_COUNT_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setTotalRoles(n)}
                className={`w-12 h-12 rounded-full text-sm font-medium border transition-colors ${
                  totalRoles === n
                    ? 'bg-foreground text-background border-foreground'
                    : 'bg-transparent text-muted-foreground border-border hover:border-foreground hover:text-foreground'
                }`}
              >
                {n === 5 ? '5+' : n}
              </button>
            ))}
          </div>
        </div>

        <Button size="lg" onClick={() => startRoleSetup(0)} disabled={totalRoles === 0} className="w-full">
          Start Interview
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (step === 'role-setup') {
    const valid = company.trim() && jobTitle.trim();
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Role {currentRoleIndex + 1} of {totalRoles}
          </p>
          <h2 className="text-xl font-bold text-foreground">Tell us about this role</h2>
          {suggestedRoles[currentRoleIndex] && (
            <p className="text-xs text-muted-foreground">Fields pre-filled from your documents — edit anything that's wrong.</p>
          )}
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Company name</label>
            <Input value={company} onChange={e => setCompany(e.target.value)} placeholder="e.g. Acme Corp" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job title</label>
            <Input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              onKeyDown={e => e.key === 'Enter' && valid && handleRoleContinue()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Start date</label>
              <Input value={startDate} onChange={e => setStartDate(e.target.value)} placeholder="e.g. Jan 2021" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">End date</label>
              <Input value={endDate} onChange={e => setEndDate(e.target.value)} placeholder="e.g. Present" />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleRoleContinue} disabled={!valid} className="flex-1">
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          {completedRoles.length > 0 && (
            <Button variant="outline" onClick={saveDraft}>
              Save & exit
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (step === 'researching') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-24">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">🔍 Looking up {company}…</p>
      </div>
    );
  }

  if (step === 'research-confirm') {
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Role {currentRoleIndex + 1} of {totalRoles} — {company}
          </p>
          <h2 className="text-xl font-bold text-foreground">About this role</h2>
        </div>

        {researchSummary ? (
          <div className="bg-card border border-border rounded-xl p-5 space-y-3">
            <p className="text-sm text-foreground leading-relaxed">{researchSummary}</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-xl p-5">
            <p className="text-sm text-muted-foreground">No research summary available. We'll go straight into the interview.</p>
          </div>
        )}

        <p className="text-sm text-foreground font-medium">Does this match your experience?</p>

        {!showClarify ? (
          <div className="flex gap-3">
            <Button onClick={() => startInterview(true)} className="flex-1">
              Yes, that's right
            </Button>
            <Button variant="outline" onClick={() => setShowClarify(true)} className="flex-1">
              Not quite
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <textarea
              value={clarification}
              onChange={e => setClarification(e.target.value)}
              placeholder="Briefly describe how your role was different…"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <Button
              onClick={() => startInterview(false, clarification)}
              disabled={!clarification.trim()}
              className="w-full"
            >
              Start Interview
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  if (step === 'interview') {
    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div>
            <p className="font-medium text-foreground">
              Role {currentRoleIndex + 1} of {totalRoles} — {jobTitle} @ {company}
            </p>
            <p className="text-xs text-muted-foreground">{displayMessages.length} exchanges</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={saveDraft}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Save & exit
            </button>
            <button
              onClick={finishRole}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="w-3.5 h-3.5" />
              Skip role
            </button>
          </div>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {displayMessages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'ai'
                    ? 'bg-muted text-foreground rounded-tl-sm'
                    : 'bg-primary text-primary-foreground rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Thinking indicator */}
          {thinking && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:0ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-muted-foreground rounded-full animate-bounce [animation-delay:300ms]" />
                </span>
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Quick-reply choices */}
        {choices.length > 0 && !thinking && (
          <div className="shrink-0 pb-2 flex flex-wrap gap-2">
            {choices.map(choice => (
              <button
                key={choice}
                onClick={() => handleChoice(choice)}
                className="px-3 py-1.5 rounded-full text-sm border border-border text-foreground hover:bg-muted transition-colors"
              >
                {choice}
              </button>
            ))}
          </div>
        )}

        {/* Text input */}
        <div className="shrink-0 pt-2 border-t border-border">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
              rows={3}
              disabled={thinking}
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
            />
            <Button onClick={handleSend} disabled={!input.trim() || thinking} className="self-end" size="icon">
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 py-8">
        <div className="space-y-3">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold text-foreground">Interview complete</h2>
          <p className="text-muted-foreground">
            We covered {completedRoles.length} role{completedRoles.length !== 1 ? 's' : ''} and
            captured your career history. Ready to build your document?
          </p>
          <p className="text-xs text-muted-foreground">This usually takes about 15 seconds.</p>
        </div>
        <Button size="lg" onClick={generate} className="w-full">
          Generate Experience Document
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  if (step === 'generating') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Building your experience document…</p>
        <p className="text-xs text-muted-foreground">This usually takes 15–30 seconds.</p>
      </div>
    );
  }

  if (step === 'output') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Your Experience Document</h2>
          <p className="text-sm text-muted-foreground">Review, then save to My Documents.</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 max-h-[50vh] overflow-y-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {generatedDoc}
          </pre>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Document name</label>
            <Input value={docName} onChange={e => setDocName(e.target.value)} />
          </div>

          {saveError && <p className="text-sm text-destructive">{saveError}</p>}

          <div className="flex gap-3">
            <Button onClick={saveToDocuments} disabled={saving} className="flex-1">
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                <><BookOpen className="w-4 h-4 mr-2" />Save to My Documents</>
              )}
            </Button>
            <Button variant="outline" onClick={copyToClipboard}>
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
