'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, Send, RotateCcw, ChevronDown, Bot, User } from 'lucide-react';
import { MarkdownText } from '@/lib/render-markdown';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  type?: 'change' | 'answer';
}

const QUICK_ACTIONS = [
  { id: 'summary',        label: 'Add summary',     prompt: 'Add a 2-3 sentence professional summary tailored to this role' },
  { id: 'remove-summary', label: 'Remove summary',  prompt: 'Remove the summary section' },
  { id: 'shorten',        label: 'Shorten bullets',  prompt: 'Shorten the bullet points — aim for one line each where possible' },
  { id: 'fit-1-page',     label: 'Fit to 1 page',   prompt: 'Trim this resume to fit on a single page. Be aggressive — prioritize the most recent and relevant role, cut older role bullets significantly, consolidate skills into fewer lines, and remove the summary if needed. Tell me what you cut.' },
  { id: 'fit-2-pages',    label: 'Fit to 2 pages',  prompt: 'Trim this resume to fit cleanly on two pages without overflow. Shorten long bullets, consolidate skills, and cut the least relevant content from older roles. Tell me what you changed.' },
  { id: 'skills',         label: 'Add skills',       prompt: 'Review the job description and add any missing relevant skills to my skills section' },
  { id: 'tighten',        label: 'Tighten language', prompt: 'Tighten the language throughout — remove weak verbs and passive voice' },
];

interface ResumeChatPanelProps {
  applicationId: string;
  currentResumeText: string;
  originalResumeText: string;
  coverLetterText?: string;
  jobDescription: string;
  company: string;
  jobTitle: string;
  backgroundExperience?: string;
  onResumeUpdate: (newText: string) => void;
  initialChatHistory?: ChatMessage[];
}

export default function ResumeChatPanel({
  applicationId,
  currentResumeText,
  originalResumeText,
  coverLetterText,
  jobDescription,
  company,
  jobTitle,
  backgroundExperience,
  onResumeUpdate,
  initialChatHistory,
}: ResumeChatPanelProps) {
  const openingMessage: ChatMessage = {
    role: 'assistant',
    content: `Your resume is ready. I have full context of the ${jobTitle} role at ${company} and your background. Ask me to make changes, answer questions about your resume, or use the quick actions below.`,
    type: 'answer',
  };

  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialChatHistory?.length ? initialChatHistory : [openingMessage]
  );
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [usedChips, setUsedChips] = useState<Set<string>>(new Set());
  const [changeCount, setChangeCount] = useState(0);

  const resumeVersionsRef = useRef<{ text: string; chipId?: string }[]>([]);
  const pendingChipIdRef = useRef<string | undefined>(undefined);
  const currentResumeRef = useRef(currentResumeText);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Keep ref in sync with prop (parent may update resume externally via textarea)
  useEffect(() => {
    currentResumeRef.current = currentResumeText;
  }, [currentResumeText]);

  useEffect(() => {
    if (expanded) {
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages, expanded]);

  const send = async (userMessage: string) => {
    if (!userMessage.trim() || loading) return;
    setInput('');
    setLoading(true);
    setError('');

    const userMsg: ChatMessage = { role: 'user', content: userMessage };
    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);

    // Build chat history to send (exclude the opening AI message which is just a greeting)
    const historyToSend = nextMessages
      .slice(1) // skip opening message
      .slice(0, -1) // exclude the just-added user message
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch('/api/resume-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          message: userMessage,
          currentResumeText: currentResumeRef.current,
          originalResumeText,
          coverLetterText,
          jobDescription,
          company,
          jobTitle,
          backgroundExperience: backgroundExperience ?? '',
          chatHistory: historyToSend,
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: { type: 'change' | 'answer'; message: string; updatedResume?: string } = await res.json();

      const aiMsg: ChatMessage = { role: 'assistant', content: data.message, type: data.type };
      setMessages(prev => [...prev, aiMsg]);

      if (data.type === 'change' && data.updatedResume) {
        resumeVersionsRef.current = [
          { text: currentResumeRef.current, chipId: pendingChipIdRef.current },
          ...resumeVersionsRef.current,
        ].slice(0, 5);
        setChangeCount(c => c + 1);
        onResumeUpdate(data.updatedResume);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      // Remove the user message we optimistically added
      setMessages(prev => prev.slice(0, -1));
      // Restore chip to available list if this was a chip-triggered action
      if (pendingChipIdRef.current) {
        const chipId = pendingChipIdRef.current;
        setUsedChips(prev => { const next = new Set(prev); next.delete(chipId); return next; });
      }
    } finally {
      pendingChipIdRef.current = undefined;
      setLoading(false);
    }
  };

  const handleUndo = () => {
    if (resumeVersionsRef.current.length === 0) return;
    const [prev, ...rest] = resumeVersionsRef.current;
    resumeVersionsRef.current = rest;
    setChangeCount(c => Math.max(0, c - 1));
    onResumeUpdate(prev.text);
    // Restore the chip that triggered this change so it can be used again
    if (prev.chipId) {
      setUsedChips(prevChips => { const next = new Set(prevChips); next.delete(prev.chipId!); return next; });
    }
  };

  const handleChip = (chip: typeof QUICK_ACTIONS[0]) => {
    setUsedChips(prev => { const next = new Set(prev); next.add(chip.id); return next; });
    pendingChipIdRef.current = chip.id;
    send(chip.prompt);
  };

  const availableChips = QUICK_ACTIONS.filter(c => !usedChips.has(c.id));
  const canUndo = resumeVersionsRef.current.length > 0;

  return (
    <div className="mt-6 border border-border rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-muted/50 transition-colors"
        title={expanded ? 'Collapse resume chat' : 'Open AI chat to refine your resume'}
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <MessageCircle className="w-4 h-4 text-primary" />
          Resume Chat
          {changeCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground ml-1">
              ({changeCount} change{changeCount !== 1 ? 's' : ''} made)
            </span>
          )}
        </span>
        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
          {!expanded && 'Want to refine your resume?'}
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} />
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Messages */}
          <div className="px-4 py-3 space-y-3 max-h-96 overflow-y-auto">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'assistant' ? 'bg-primary/10' : 'bg-muted'
                }`}>
                  {msg.role === 'assistant'
                    ? <Bot className="w-3.5 h-3.5 text-primary" />
                    : <User className="w-3.5 h-3.5 text-muted-foreground" />
                  }
                </div>
                <div className={`rounded-xl px-3.5 py-2.5 text-sm max-w-[82%] ${
                  msg.role === 'assistant'
                    ? 'bg-muted text-foreground'
                    : 'bg-primary text-primary-foreground'
                }`}>
                  {msg.type === 'change' && msg.role === 'assistant' && (
                    <span className="text-xs font-semibold text-green-500 block mb-1">✓ Resume updated</span>
                  )}
                  {msg.role === 'assistant'
                    ? <MarkdownText text={msg.content} />
                    : <p className="leading-relaxed">{msg.content}</p>
                  }
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5">
                <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-primary/10">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="rounded-xl px-3.5 py-3 bg-muted">
                  <span className="flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {error && <p className="px-4 pb-2 text-xs text-destructive">{error}</p>}

          {/* Quick action chips */}
          {availableChips.length > 0 && (
            <div className="px-4 pb-3 flex flex-wrap gap-2">
              {availableChips.map(chip => (
                <button
                  key={chip.id}
                  onClick={() => handleChip(chip)}
                  disabled={loading}
                  className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                  title={chip.prompt}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          )}

          {/* Undo + input row */}
          <div className="px-4 pb-4 space-y-2 border-t border-border pt-3">
            {canUndo && (
              <button
                onClick={handleUndo}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                title={`Undo the last AI change (${resumeVersionsRef.current.length} available)`}
              >
                <RotateCcw className="w-3 h-3" />
                Undo last change ({resumeVersionsRef.current.length} available)
              </button>
            )}
            <div className="flex gap-2 items-end">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask anything about your resume or request changes…"
                className="min-h-[2.5rem] max-h-32 resize-none text-sm flex-1"
                disabled={loading}
              />
              <Button
                size="sm"
                onClick={() => send(input)}
                disabled={!input.trim() || loading}
                title="Send message (or press Enter)"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
