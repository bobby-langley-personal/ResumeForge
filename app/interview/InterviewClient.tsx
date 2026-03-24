'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, ArrowRight, SkipForward, Loader2, Copy, Check, BookOpen } from 'lucide-react';

interface InterviewAnswer {
  question: string;
  answer: string;
}

interface InterviewRole {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  answers: InterviewAnswer[];
}

interface Message {
  role: 'ai' | 'user';
  content: string;
}

type Step = 'intro' | 'role-setup' | 'interview' | 'complete' | 'generating' | 'output';

const QUESTIONS = (company: string) => [
  `What did ${company} do, and what was your role on the team?`,
  'What were the biggest problems you solved or fires you put out?',
  'What tools, platforms, and technologies did you use on a daily basis?',
  'Did you build, improve, or document any processes or workflows?',
  'What metrics or outcomes did your work contribute to — even roughly?',
  'Who did you collaborate with and how? (other teams, stakeholders, clients)',
  "What are you most proud of from this role that isn't on your resume?",
  'Anything else about this role worth capturing?',
];

const ROLE_COUNT_OPTIONS = [1, 2, 3, 4, 5];

export default function InterviewClient() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('intro');
  const [totalRoles, setTotalRoles] = useState(0);
  const [completedRoles, setCompletedRoles] = useState<InterviewRole[]>([]);
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);

  // Role setup form
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Interview chat
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswers, setCurrentAnswers] = useState<InterviewAnswer[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Output
  const [generatedDoc, setGeneratedDoc] = useState('');
  const [docName, setDocName] = useState('My Experience Document');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const startRoleSetup = (roleIndex: number) => {
    setCompany('');
    setJobTitle('');
    setStartDate('');
    setEndDate('');
    setCurrentRoleIndex(roleIndex);
    setStep('role-setup');
  };

  const startInterview = () => {
    const questions = QUESTIONS(company);
    setMessages([{ role: 'ai', content: questions[0] }]);
    setCurrentAnswers([]);
    setCurrentQuestionIndex(0);
    setInput('');
    setStep('interview');
  };

  const sendAnswer = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const questions = QUESTIONS(company);
    const answer: InterviewAnswer = { question: questions[currentQuestionIndex], answer: trimmed };
    const newAnswers = [...currentAnswers, answer];
    const newMessages: Message[] = [...messages, { role: 'user', content: trimmed }];

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < questions.length) {
      newMessages.push({ role: 'ai', content: questions[nextIndex] });
      setCurrentQuestionIndex(nextIndex);
    }

    setMessages(newMessages);
    setCurrentAnswers(newAnswers);
    setInput('');

    if (nextIndex >= questions.length) {
      finishRole(newAnswers);
    }
  };

  const skipRole = () => {
    finishRole(currentAnswers);
  };

  const finishRole = (answers: InterviewAnswer[]) => {
    const role: InterviewRole = { company, title: jobTitle, startDate, endDate, answers };
    const newCompleted = [...completedRoles, role];
    setCompletedRoles(newCompleted);

    const nextRoleIndex = currentRoleIndex + 1;
    if (nextRoleIndex < totalRoles) {
      startRoleSetup(nextRoleIndex);
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
        body: JSON.stringify({ roles: completedRoles }),
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
          title: docName.trim() || 'My Experience Document',
          content: { text: generatedDoc },
          item_type: 'other',
          is_default: false,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
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

  // ── Intro ──────────────────────────────────────────────────────────────────
  if (step === 'intro') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-8 py-8">
        <div className="space-y-3">
          <div className="text-4xl">🎤</div>
          <h1 className="text-2xl font-bold text-foreground">Build Your Experience Document</h1>
          <p className="text-muted-foreground leading-relaxed">
            Most resumes undersell the candidate. This interview will help you capture
            everything — the tools you use daily, the fires you've put out, the processes you
            quietly improved.
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 text-left space-y-2">
          <p className="text-sm font-medium text-foreground">How it works:</p>
          <ul className="text-sm text-muted-foreground space-y-1.5">
            <li>• We'll go role by role, starting with your most recent job</li>
            <li>• Answer honestly — nothing is too obvious or unimportant</li>
            <li>• When we're done, you'll get a detailed experience document ready to save</li>
          </ul>
          <p className="text-xs text-muted-foreground pt-1">Takes about 15–20 minutes for a full career.</p>
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

        <Button
          size="lg"
          onClick={() => startRoleSetup(0)}
          disabled={totalRoles === 0}
          className="w-full"
        >
          Start Interview
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ── Role Setup ─────────────────────────────────────────────────────────────
  if (step === 'role-setup') {
    const valid = company.trim() && jobTitle.trim();
    return (
      <div className="max-w-lg mx-auto space-y-6 py-8">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
            Role {currentRoleIndex + 1} of {totalRoles}
          </p>
          <h2 className="text-xl font-bold text-foreground">Tell us about this role</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Company name</label>
            <Input
              value={company}
              onChange={e => setCompany(e.target.value)}
              placeholder="e.g. Acme Corp"
              onKeyDown={e => e.key === 'Enter' && valid && startInterview()}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Job title</label>
            <Input
              value={jobTitle}
              onChange={e => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Software Engineer"
              onKeyDown={e => e.key === 'Enter' && valid && startInterview()}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Start date</label>
              <Input
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                placeholder="e.g. Jan 2021"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">End date</label>
              <Input
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                placeholder="e.g. Present"
              />
            </div>
          </div>
        </div>

        <Button onClick={startInterview} disabled={!valid} className="w-full">
          Start questions for this role
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ── Interview Chat ─────────────────────────────────────────────────────────
  if (step === 'interview') {
    const questions = QUESTIONS(company);
    const questionsDone = currentQuestionIndex >= questions.length;

    return (
      <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border shrink-0">
          <div>
            <p className="font-medium text-foreground">
              Role {currentRoleIndex + 1} of {totalRoles} — {company}
            </p>
            <p className="text-xs text-muted-foreground">
              {questionsDone
                ? 'All questions answered'
                : `Question ${Math.min(currentQuestionIndex + 1, questions.length)} of ${questions.length}`}
            </p>
          </div>
          <button
            onClick={skipRole}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
            Skip role
          </button>
        </div>

        {/* Chat messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'ai'
                    ? 'bg-muted text-foreground rounded-tl-sm'
                    : 'bg-primary text-primary-foreground rounded-tr-sm'
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          <div ref={chatEndRef} />
        </div>

        {/* Input */}
        {!questionsDone && (
          <div className="shrink-0 pt-3 border-t border-border">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendAnswer();
                  }
                }}
                placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                rows={3}
                className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <Button
                onClick={sendAnswer}
                disabled={!input.trim()}
                className="self-end"
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Complete ───────────────────────────────────────────────────────────────
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
        </div>
        <Button size="lg" onClick={generate} className="w-full">
          Generate Experience Document
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    );
  }

  // ── Generating ─────────────────────────────────────────────────────────────
  if (step === 'generating') {
    return (
      <div className="max-w-lg mx-auto text-center space-y-4 py-16">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
        <p className="text-muted-foreground">Building your experience document…</p>
        <p className="text-xs text-muted-foreground">This usually takes 15–30 seconds.</p>
      </div>
    );
  }

  // ── Output ─────────────────────────────────────────────────────────────────
  if (step === 'output') {
    return (
      <div className="max-w-2xl mx-auto space-y-6 py-8">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-foreground">Your Experience Document</h2>
          <p className="text-sm text-muted-foreground">Review, then save to My Documents.</p>
        </div>

        {/* Document preview */}
        <div className="bg-card border border-border rounded-xl p-5 max-h-[50vh] overflow-y-auto">
          <pre className="text-sm text-foreground whitespace-pre-wrap font-sans leading-relaxed">
            {generatedDoc}
          </pre>
        </div>

        {/* Save controls */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Document name</label>
            <Input
              value={docName}
              onChange={e => setDocName(e.target.value)}
              placeholder="My Experience Document"
            />
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
