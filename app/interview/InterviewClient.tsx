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

interface SessionRow {
  id: string;
  completed_roles: CompletedRole[];
  draft_state: InterviewDraft | null;
}

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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draftSession, setDraftSession] = useState<SessionRow | null>(null);
  const [existingDocs, setExistingDocs] = useState<ExistingDoc[]>([]);
  const [useExistingDocs, setUseExistingDocs] = useState(false);
  const [existingDocsContext, setExistingDocsContext] = useState('');

  const [totalRoles, setTotalRoles] = useState(0);
  const [completedRoles, setCompletedRoles] = useState<CompletedRole[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [revisitingIndex, setRevisitingIndex] = useState(-1);
  const [suggestedRoles, setSuggestedRoles] = useState<{ company: string; title: string; startDate: string; endDate: string }[]>([]);
  const [selectedSuggested, setSelectedSuggested] = useState<boolean[]>([]);
  const [customRoles, setCustomRoles] = useState<{ company: string; title: string }[]>([]);
  const [customCompany, setCustomCompany] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [extracting, setExtracting] = useState(false);

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

  // Preload existing docs + check for saved Supabase session in parallel on mount
  useEffect(() => {
    Promise.all([
      fetch('/api/resumes').then(r => r.json()).catch(() => []),
      fetch('/api/interview/sessions').then(r => r.json()).catch(() => ({ session: null })),
    ]).then(([docs, sessionResp]) => {
      const validDocs: ExistingDoc[] = docs ?? [];
      setExistingDocs(validDocs);

      // Kick off role extraction in the background if docs exist
      if (validDocs.length > 0) {
        setExtracting(true);
        fetch('/api/interview/extract-roles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documents: validDocs.map((d: ExistingDoc) => ({ title: d.title, text: d.content.text })),
          }),
        })
          .then(r => r.json())
          .then(data => {
            if (data.roles?.length) {
              setSuggestedRoles(data.roles);
              setSelectedSuggested(data.roles.map(() => true));
            }
          })
          .catch(() => { /* non-fatal */ })
          .finally(() => setExtracting(false));
      }

      const session: SessionRow | null = sessionResp.session ?? null;
      if (session) {
        setSessionId(session.id);
        setDraftSession(session);
        setStep('draft-prompt');
        return;
      }

      setStep(validDocs.length > 0 ? 'doc-prompt' : 'intro');
    });
  }, []);

  // ── Draft helpers ──────────────────────────────────────────────────────────

  const buildDraftPayload = (overrideRoles?: CompletedRole[]) => {
    const roles = overrideRoles ?? completedRoles;
    const draftState: InterviewDraft = {
      totalRoles,
      currentRoleIndex,
      completedRoles: roles,
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
    return { completed_roles: roles, draft_state: draftState };
  };

  const persistSession = async (overrideRoles?: CompletedRole[]) => {
    const payload = buildDraftPayload(overrideRoles);
    try {
      if (sessionId) {
        await fetch(`/api/interview/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        const res = await fetch('/api/interview/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const data = await res.json();
        setSessionId(data.id);
      }
    } catch { /* non-fatal */ }
  };

  const saveDraft = async () => {
    await persistSession();
    router.push('/resumes');
  };

  const clearSession = async () => {
    if (!sessionId) return;
    try {
      await fetch(`/api/interview/sessions/${sessionId}`, { method: 'DELETE' });
    } catch { /* non-fatal */ }
    setSessionId(null);
    setDraftSession(null);
  };

  const restoreDraft = () => {
    const session = draftSession;
    if (!session?.draft_state) { setStep('intro'); return; }
    const draft = session.draft_state;
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
  };

  const discardDraft = async () => {
    await clearSession();
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

  const beginInterview = () => {
    const active = [
      ...suggestedRoles.filter((_, i) => selectedSuggested[i] !== false),
      ...customRoles.map(r => ({ ...r, startDate: '', endDate: '' })),
    ];
    if (active.length === 0) return;
    setSuggestedRoles(active);
    setTotalRoles(active.length);
    setCompletedRoles([]);
    startRoleSetup(0, active);
  };

  const startRoleSetup = (index: number, rolesList?: typeof suggestedRoles) => {
    const roles = rolesList ?? suggestedRoles;
    const suggested = roles[index];
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

    if (revisitingIndex >= 0) {
      const updated = completedRoles.map((r, i) => i === revisitingIndex ? role : r);
      setCompletedRoles(updated);
      setRevisitingIndex(-1);
      setStep('complete');
      persistSession(updated); // auto-save in background
      return;
    }

    const updated = [...completedRoles, role];
    setCompletedRoles(updated);
    persistSession(updated); // auto-save in background

    if (currentRoleIndex + 1 < totalRoles) {
      startRoleSetup(currentRoleIndex + 1, suggestedRoles);
    } else {
      setStep('complete');
    }
  };

  const revisitRole = (index: number) => {
    const role = completedRoles[index];
    setCompany(role.company);
    setJobTitle(role.title);
    setStartDate(role.startDate);
    setEndDate(role.endDate);
    setResearchSummary('');
    setResearchConfirmed(false);
    setClarification('');
    setShowClarify(false);
    setCurrentRoleIndex(index);
    setRevisitingIndex(index);
    // Reconstruct display messages from history (strip CHOICES: lines)
    const rebuilt: DisplayMessage[] = role.history.map(m => ({
      role: m.role === 'assistant' ? 'ai' : 'user',
      content: m.role === 'assistant' ? parseChoices(m.content).display : m.content,
    }));
    setHistory(role.history);
    setDisplayMessages(rebuilt);
    setChoices([]);
    setInput('');
    setStep('interview');
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
      await clearSession();
      router.push('/resumes');
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Save failed');
      setSaving(false);
    }
  };

  const [transcriptCopied, setTranscriptCopied] = useState(false);

  const copyTranscript = async () => {
    const lines: string[] = [];

    completedRoles.forEach((role, i) => {
      lines.push(`=== Role ${i + 1}: ${role.title} @ ${role.company} (${role.startDate}–${role.endDate}) ===\n`);
      role.history.forEach(m => {
        lines.push(`${m.role === 'assistant' ? 'Interviewer' : 'You'}: ${m.content}\n`);
      });
      lines.push('');
    });

    if (history.length > 0) {
      lines.push(`=== Role ${currentRoleIndex + 1}: ${jobTitle} @ ${company} (in progress) ===\n`);
      history.forEach(m => {
        lines.push(`${m.role === 'assistant' ? 'Interviewer' : 'You'}: ${m.content}\n`);
      });
    }

    await navigator.clipboard.writeText(lines.join('\n'));
    setTranscriptCopied(true);
    setTimeout(() => setTranscriptCopied(false), 2000);
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
    const draft = draftSession?.draft_state ?? null;
    const completedInDraft = draftSession?.completed_roles ?? [];

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="text-3xl">💾</div>
          <h2 className="text-xl font-bold text-foreground">Resume your interview?</h2>
          <p className="text-sm text-muted-foreground">
            You have a saved interview in progress.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 space-y-1.5 text-sm">
          <p className="text-foreground font-medium">
            {completedInDraft.length} role{completedInDraft.length !== 1 ? 's' : ''} completed
            {draft?.company ? ` · currently on ${draft.company}` : ''}
          </p>
          {completedInDraft.length > 0 && (
            <p className="text-muted-foreground text-xs">
              {completedInDraft.map(r => `${r.title} @ ${r.company}`).join(', ')}
            </p>
          )}
        </div>

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
            Yes, use my experience
          </Button>
          <Button variant="outline" onClick={() => handleUseExistingDocs(false)} className="flex-1">
            Start from scratch
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'intro') {
    const activeCount = suggestedRoles.filter((_, i) => selectedSuggested[i] !== false).length + customRoles.length;

    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl">🎤</div>
          <h1 className="text-2xl font-bold text-foreground">Build Your Experience Document</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This interview captures everything — the tools you use daily, the fires you've put out, the processes you quietly improved.
          </p>
        </div>

        {/* Role checklist */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            {extracting ? 'Detecting roles from your documents…' : suggestedRoles.length > 0 ? 'Select the roles to cover:' : 'Which roles would you like to cover?'}
          </p>

          {extracting && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Scanning your documents…
            </div>
          )}

          {suggestedRoles.map((role, i) => (
            <label key={i} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={selectedSuggested[i] !== false}
                onChange={e => setSelectedSuggested(prev => {
                  const next = [...prev];
                  next[i] = e.target.checked;
                  return next;
                })}
                className="w-4 h-4 accent-primary shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{role.title}</p>
                <p className="text-xs text-muted-foreground">{role.company}{role.startDate ? ` · ${role.startDate}–${role.endDate || 'Present'}` : ''}</p>
              </div>
            </label>
          ))}

          {customRoles.map((role, i) => (
            <div key={`custom-${i}`} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
              <input type="checkbox" checked readOnly className="w-4 h-4 accent-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{role.title}</p>
                <p className="text-xs text-muted-foreground">{role.company}</p>
              </div>
              <button
                onClick={() => setCustomRoles(prev => prev.filter((_, j) => j !== i))}
                className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
              >
                Remove
              </button>
            </div>
          ))}

          {/* Add custom role */}
          <div className="flex gap-2 pt-1">
            <Input
              value={customCompany}
              onChange={e => setCustomCompany(e.target.value)}
              placeholder="Company"
              className="flex-1"
            />
            <Input
              value={customTitle}
              onChange={e => setCustomTitle(e.target.value)}
              placeholder="Job title"
              className="flex-1"
              onKeyDown={e => {
                if (e.key === 'Enter' && customCompany.trim() && customTitle.trim()) {
                  setCustomRoles(prev => [...prev, { company: customCompany.trim(), title: customTitle.trim() }]);
                  setCustomCompany('');
                  setCustomTitle('');
                }
              }}
            />
            <Button
              variant="outline"
              size="sm"
              disabled={!customCompany.trim() || !customTitle.trim()}
              onClick={() => {
                setCustomRoles(prev => [...prev, { company: customCompany.trim(), title: customTitle.trim() }]);
                setCustomCompany('');
                setCustomTitle('');
              }}
            >
              Add
            </Button>
          </div>
        </div>

        <Button size="lg" onClick={beginInterview} disabled={activeCount === 0} className="w-full">
          Start Interview ({activeCount} role{activeCount !== 1 ? 's' : ''})
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <p className="text-xs text-muted-foreground text-center leading-relaxed">
          🧪 This feature is brand new — if anything goes wrong during generation, your answers won't be lost. Use the <span className="font-medium">Copy transcript</span> button in the chat to save your responses at any time.
        </p>
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
              onClick={copyTranscript}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              title="Copy full transcript to clipboard"
            >
              {transcriptCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {transcriptCopied ? 'Copied!' : 'Copy transcript'}
            </button>
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
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl">✓</div>
          <h2 className="text-xl font-bold text-foreground">Interview complete</h2>
          <p className="text-muted-foreground text-sm">
            Review your roles below, then generate your document.
          </p>
        </div>

        <div className="space-y-2">
          {completedRoles.map((role, i) => {
            const exchanges = Math.floor(role.history.length / 2);
            const skipped = role.history.length === 0;
            return (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{role.title} @ {role.company}</p>
                  <p className="text-xs text-muted-foreground">
                    {skipped ? 'Skipped' : `${exchanges} exchange${exchanges !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <button
                  onClick={() => revisitRole(i)}
                  className="text-xs text-primary hover:underline shrink-0 ml-3"
                >
                  {skipped ? 'Start' : 'Continue'}
                </button>
              </div>
            );
          })}
        </div>

        <Button size="lg" onClick={generate} className="w-full">
          Generate Experience Document
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
        <p className="text-xs text-muted-foreground text-center">This usually takes about 15 seconds.</p>
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
          <p className="text-sm text-muted-foreground">Review, then save to My Experience.</p>
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
                <><BookOpen className="w-4 h-4 mr-2" />Save to My Experience</>
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
