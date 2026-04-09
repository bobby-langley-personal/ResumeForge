'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignedIn, useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSSEStream } from '@/lib/sse-reader';
import { Loader2, Eye, Download, RotateCcw, X, Crown } from 'lucide-react';
import { FitAnalysis } from '@/types/fit-analysis';
import { ResumeItem } from '@/types/resume';
import ExperiencePanel from '@/components/ExperiencePanel';
import TourGuide from '@/components/TourGuide';
import FitAnalysisModal from '@/components/FitAnalysisModal';
import { InterviewPrepSection } from '@/components/InterviewPrepPanel';
import ResumeChatPanel from '@/components/ResumeChatPanel';

const PDFPreviewModal = dynamic(() => import('@/components/PDFPreviewModal'), { ssr: false });
const InlinePDFViewer = dynamic(() => import('@/components/InlinePDFViewer'), { ssr: false });

type UIState = 'idle' | 'analyzing' | 'review' | 'generating' | 'done' | 'error';

const IS_DEV = process.env.NODE_ENV === 'development';

const DEV_JD = `Kforce has a client in New York, NY that is seeking a Technical Support Specialist to join a fast-paced, global support organization within the financial technology space.

Responsibilities:
- Engage with customers to resolve issues submitted through support tickets in accordance with defined service levels
- Troubleshoot and resolve both general inquiries and complex technical issues
- Craft clear, professional, and tailored written communications to help customers understand and resolve their issues
- Collaborate cross-functionally with internal teams including Partner Management, Business Development, Compliance, Product, and Engineering
- Serve as a trusted advisor to customers with a professional, empathetic, and approachable communication style
- Validate, document, and complete escalation requests while ensuring proper follow-up and resolution
- Participate in incident management activities, including communicating customer impact and status updates
- Identify opportunities for operational improvements and contribute to solutions that help scale the support organization
- Maintain and update internal documentation to support consistency and knowledge sharing

Requirements:
- 2+ years of experience in a fast-paced, customer-facing support environment
- Experience using ticketing systems such as Zendesk, HubSpot, or similar platforms
- Strong written and verbal communication skills
- Customer-focused mindset with a strong commitment to delivering high-quality service
- Comfortable working with Slack, macOS, and Google Workspace
- Prior experience in financial services, payments, or fintech preferred
- Familiarity with data analytics tools for troubleshooting preferred`;

const DEV_RESUME = `Robert Langley
Palm Beach, FL | (772) 801-9259 | bobby@bobbylangley.com | linkedin.com/in/bobby-langley/

SUMMARY
Technical Support Engineer with 4+ years of experience resolving complex issues for SaaS customers through clear written communication and systematic troubleshooting. Passionate about turning customer pain points into product improvements and building support processes that scale.

EXPERIENCE
Grubbrr | Boca Raton, FL | May 2021 – Sept. 2025

L3 Support Engineer | Oct. 2023 – Sep. 2025
• Established the Engineering Support / L3 department and led initiatives that reduced average ticket resolution time by 50%
• Integrated Jira with Salesforce and incorporated 10 additional data points for analytics, enabling data-driven identification of high-priority bugs
• Performed code-level debugging and log analysis to identify root causes of production issues
• Managed ongoing customer relationships primarily through written communication, turning at-risk clients into product advocates
• Leveraged Zendesk to manage and optimize support workflows, surfacing ticket trends to drive product feedback loops
• Authored internal knowledge base articles reducing repetitive escalations by 30%
• Trained QA and Support Leads on advanced tools (Postman, network sniffing, Web Inspector), improving troubleshooting efficiency by ~40%

Technical Product Owner | Apr. 2023 – Sep. 2023
• Championed customer feedback to drive a platform refactor that reduced customer churn from 60% to 20% over 12 months
• Created 100+ supportability tickets that reduced time-intensive dev/PO discussions by 30%
• Refactored 3 payment integrations (Square, Verifone, Freedompay), eliminating charging errors

QA / Deployment Engineer | Oct. 2022 – Mar. 2023
• Resolved 400+ ticket backlog by proactively assisting offshore QA team
• Owned Tizen IDE and AWS hosting, becoming company's centralized resource for build management
• Developed custom React & Kotlin kiosk builds for tradeshows, boosting sales conversions

Developer (Intern) | May 2021 – Oct. 2022
• Created proof-of-concept apps for Sales/Executives, directly contributing to new client acquisitions
• Engineered workarounds to run modern Angular/HTML/CSS on deprecated platform, extending viability by 18+ months
• Built JavaScript/HTML diagnostic tools and REST API integrations used by Support teams

EDUCATION
Boca Code | Boca Raton, FL — Software Engineering Certification
Florida State University | Tallahassee, FL — B.S. Environmental Science

TECHNICAL SKILLS
Languages & Frameworks: JavaScript, TypeScript, Angular, HTML/CSS, Node.js
Tools & Platforms: Jira, Salesforce, GitHub, AWS, Postman, Confluence, Zendesk
Specializations: API development, WebSocket integrations, automation scripting, QA/regression testing, technical documentation`;

interface FormData {
  company: string;
  jobTitle: string;
  jobDescription: string;
  backgroundExperience: string;
  isFromUploadedFile?: boolean;
}

export default function Home() {
  const { user } = useUser();
  const router = useRouter();
  const candidateName = user?.fullName ?? user?.firstName ?? '';

  // Redirect to onboarding if the user has no experience files
  useEffect(() => {
    fetch('/api/resumes')
      .then(r => r.json())
      .then(data => { if (!Array.isArray(data) || data.length === 0) router.replace('/'); })
      .catch(() => {}); // fail open — don't block on network error
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [billingStatus, setBillingStatus] = useState<{ subscription_status: string; tailored_resume_count: number } | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<'monthly' | 'quarterly' | 'annual' | null>(null);
  const preGenLimitReached = useRef(false);

  // Fetch billing status and handle ?upgraded=true
  useEffect(() => {
    fetch('/api/billing/status')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setBillingStatus(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('upgraded') === 'true') {
      setBillingStatus(prev => prev ? { ...prev, subscription_status: 'pro' } : null);
    }
  }, []);

  const handleUpgrade = async (plan: 'monthly' | 'quarterly' | 'annual') => {
    setUpgradeLoading(plan);
    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch {
      setUpgradeLoading(null);
    }
  };

  const [uiState, setUIState] = useState<UIState>('idle');
  const [resetKey, setResetKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [additionalContext, setAdditionalContext] = useState<ResumeItem[]>([]);
  const [includeCoverLetter, setIncludeCoverLetter] = useState(false);
  const [includeSummary, setIncludeSummary] = useState(false);
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [jobUrl, setJobUrl] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [urlImported, setUrlImported] = useState(false);
  const [isParsingJD, setIsParsingJD] = useState(false);
  const [manualExperience, setManualExperience] = useState('');
  const [questions, setQuestions] = useState<string[]>(['']);
  const [shortResponse, setShortResponse] = useState(false);
  const [questionsExpanded, setQuestionsExpanded] = useState(false);
  const [questionAnswers, setQuestionAnswers] = useState<{ question: string; answer: string }[]>([]);
  const [answersExpanded, setAnswersExpanded] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [previewType, setPreviewType] = useState<'resume' | 'cover-letter' | null>(null);
  const [showPdfView, setShowPdfView] = useState(true);
  const [usingBaseResume, setUsingBaseResume] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const analyzingRef = useRef<HTMLDivElement>(null);
  const originalResumeRef = useRef('');

  // Capture original resume text the first time generation completes
  useEffect(() => {
    if (uiState === 'done' && resumeContent && !originalResumeRef.current) {
      originalResumeRef.current = resumeContent;
    }
  }, [uiState, resumeContent]);

  // Re-fetch billing status after generation so counter updates
  useEffect(() => {
    if (uiState === 'done') {
      fetch('/api/billing/status')
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setBillingStatus(d); })
        .catch(() => {});
    }
  }, [uiState]);

  // Scroll to loading bar when analysis starts
  useEffect(() => {
    if (uiState === 'analyzing' && analyzingRef.current) {
      analyzingRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [uiState]);

  // Pre-generation refs — background generation starts 500ms after fit analysis
  type PreGenStatus = 'idle' | 'pending' | 'running' | 'done' | 'aborted';
  const preGenStatus = useRef<PreGenStatus>('idle');
  const preGenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preGenAbort = useRef<AbortController | null>(null);
  const preGenBuffer = useRef({ resume: '', coverLetter: '', answers: [] as { question: string; answer: string }[], applicationId: null as string | null, lastStatus: '' });

  const fillTestData = () => {
    setCompany('Kforce / Fintech Client');
    setJobTitle('Technical Support Specialist');
    setJobDescription(DEV_JD);
    setManualExperience(DEV_RESUME);
  };

  const addQuestion = () => setQuestions(qs => qs.length < 5 ? [...qs, ''] : qs);
  const removeQuestion = (i: number) => setQuestions(qs => qs.length === 1 ? [''] : qs.filter((_, idx) => idx !== i));
  const updateQuestion = (i: number, val: string) => setQuestions(qs => qs.map((q, idx) => idx === i ? val : q));
  const copyAnswer = (text: string, idx: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    });
  };

  const handleJDPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText.trim()) return;
    setIsParsingJD(true);
    fetch('/api/parse-job-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jobDescription: pastedText }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { company?: string | null; jobTitle?: string | null; questions?: string[] } | null) => {
        if (data?.company) setCompany(data.company);
        if (data?.jobTitle) setJobTitle(data.jobTitle);
        if (data?.questions && data.questions.length > 0) {
          setQuestions(data.questions.slice(0, 5));
          setQuestionsExpanded(true);
        }
      })
      .catch(() => { /* silently ignore — user can fill manually */ })
      .finally(() => setIsParsingJD(false));
  };

  const handleFetchUrl = async () => {
    if (!jobUrl.trim()) return;
    setIsFetchingUrl(true);
    setUrlError('');
    try {
      const res = await fetch('/api/fetch-job-posting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: jobUrl.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setJobDescription(data.jobDescription);
      if (data.company && !company) setCompany(data.company);
      if (data.jobTitle && !jobTitle) setJobTitle(data.jobTitle);
      if (data.detectedQuestions?.length > 0) {
        setQuestions(data.detectedQuestions.slice(0, 5));
        setQuestionsExpanded(true);
      }
      setUrlImported(true);
    } catch (err) {
      setUrlError(err instanceof Error ? err.message : 'Failed to fetch job posting');
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: FormData = {
      company,
      jobTitle,
      jobDescription,
      backgroundExperience: manualExperience,
      isFromUploadedFile: false,
    };

    if (!data.company || !data.jobTitle || !data.jobDescription || !data.backgroundExperience) {
      setErrorMessage('Please fill in all fields and provide your background experience (load from My Experience or upload a file)');
      setUIState('error');
      return;
    }

    setUIState('analyzing');
    setErrorMessage('');
    setPendingFormData(data);

    try {
      const response = await fetch('/api/analyze-fit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, jobUrl: jobUrl.trim() || undefined, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })) }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const analysis: FitAnalysis = await response.json();
      setFitAnalysis(analysis);
      setUIState('review');

      // Schedule background generation — starts 500ms after user sees fit analysis
      preGenStatus.current = 'pending';
      preGenTimer.current = setTimeout(() => runPreGeneration(data, analysis), 500);
    } catch (error) {
      console.error('Analysis failed:', error);
      setErrorMessage('Failed to analyze fit. Please try again.');
      setUIState('error');
    }
  };

  // Runs in background after fit analysis — writes to refs, never touches state
  const runPreGeneration = async (formData: typeof pendingFormData, analysis: FitAnalysis) => {
    if (preGenStatus.current !== 'pending') return;
    preGenStatus.current = 'running';
    preGenAbort.current = new AbortController();
    preGenBuffer.current = { resume: '', coverLetter: '', answers: [], applicationId: null, lastStatus: '' };

    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, fitAnalysis: analysis, includeCoverLetter, includeSummary, jobUrl: jobUrl.trim() || undefined, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })), questions: questions.filter(q => q.trim()), shortResponse }),
        signal: preGenAbort.current.signal,
      });
      if (response.status === 402) { preGenLimitReached.current = true; preGenStatus.current = 'aborted'; return; }
      if (!response.ok) { preGenStatus.current = 'aborted'; return; }

      for await (const chunk of readSSEStream(response)) {
        if (preGenStatus.current === 'aborted') break;
        try {
          const event = JSON.parse(chunk);
          switch (event.type) {
            case 'status': preGenBuffer.current.lastStatus = event.message; break;
            case 'resume_chunk': preGenBuffer.current.resume += event.content; break;
            case 'cover_letter_chunk': preGenBuffer.current.coverLetter += event.content; break;
            case 'questions_done': preGenBuffer.current.answers = event.answers ?? []; break;
            case 'done':
              preGenBuffer.current.applicationId = event.applicationId ?? null;
              preGenStatus.current = 'done';
              break;
            case 'error': preGenStatus.current = 'aborted'; break;
          }
        } catch { /* ignore parse errors */ }
      }
    } catch {
      if (preGenStatus.current !== 'aborted') preGenStatus.current = 'aborted';
    }
  };

  const handleGenerateDocuments = async () => {
    if (!pendingFormData || !fitAnalysis) return;

    if (preGenTimer.current) { clearTimeout(preGenTimer.current); preGenTimer.current = null; }

    setUIState('generating');
    setStatusMessage('Starting generation...');
    setResumeContent('');
    setCoverLetterContent('');
    setQuestionAnswers([]);

    if (preGenStatus.current === 'done') {
      setResumeContent(preGenBuffer.current.resume);
      setCoverLetterContent(preGenBuffer.current.coverLetter);
      setQuestionAnswers(preGenBuffer.current.answers);
      if (preGenBuffer.current.applicationId) setApplicationId(preGenBuffer.current.applicationId);
      setStatusMessage('Generation complete!');
      setUIState('done');
      return;
    }

    if (preGenStatus.current === 'running') {
      const poll = setInterval(() => {
        setResumeContent(preGenBuffer.current.resume);
        setCoverLetterContent(preGenBuffer.current.coverLetter);
        if (preGenBuffer.current.lastStatus) setStatusMessage(preGenBuffer.current.lastStatus);
        if (preGenStatus.current === 'done') {
          clearInterval(poll);
          setQuestionAnswers(preGenBuffer.current.answers);
          if (preGenBuffer.current.applicationId) setApplicationId(preGenBuffer.current.applicationId);
          setStatusMessage('Generation complete!');
          setUIState('done');
        } else if (preGenStatus.current === 'aborted') {
          clearInterval(poll);
          if (preGenLimitReached.current) {
            preGenLimitReached.current = false;
            setShowUpgradeModal(true);
            setUIState('idle');
          } else {
            setErrorMessage('Generation failed. Please try again.');
            setUIState('error');
          }
        }
      }, 50);
      return;
    }

    preGenStatus.current = 'aborted';

    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingFormData, fitAnalysis, includeCoverLetter, includeSummary, jobUrl: jobUrl.trim() || undefined, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })), questions: questions.filter(q => q.trim()), shortResponse }),
      });

      if (response.status === 402) { setShowUpgradeModal(true); setUIState('idle'); return; }
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      for await (const chunk of readSSEStream(response)) {
        try {
          const event = JSON.parse(chunk);
          switch (event.type) {
            case 'status': setStatusMessage(event.message); break;
            case 'resume_chunk': setResumeContent(prev => prev + event.content); break;
            case 'resume_done':
              if (includeCoverLetter) setStatusMessage('Writing cover letter...');
              else if (questions.some(q => q.trim())) setStatusMessage('Answering questions...');
              else setStatusMessage('Saving...');
              break;
            case 'cover_letter_chunk': setCoverLetterContent(prev => prev + event.content); break;
            case 'cover_letter_done':
              setStatusMessage(questions.some(q => q.trim()) ? 'Answering questions...' : 'Saving...');
              break;
            case 'questions_done':
              setQuestionAnswers(event.answers ?? []);
              setStatusMessage('Saving...');
              break;
            case 'done':
              setStatusMessage('Generation complete!');
              setUIState('done');
              if (event.applicationId) setApplicationId(event.applicationId);
              break;
            case 'error':
              setErrorMessage(event.message || 'An error occurred');
              setUIState('error');
              break;
          }
        } catch (parseError) {
          console.error('Failed to parse SSE chunk:', parseError);
        }
      }
    } catch (error) {
      console.error('Generation failed:', error);
      setErrorMessage('Failed to generate documents. Please try again.');
      setUIState('error');
    }
  };

  const handleDownload = async (type: 'resume' | 'cover-letter') => {
    if (!applicationId) {
      setErrorMessage('No application ID available');
      setUIState('error');
      return;
    }

    try {
      const response = await fetch(`/api/download-pdf/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch?.[1] || `${type}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      setErrorMessage('Failed to download PDF');
      setUIState('error');
    }
  };

  const resetForm = () => {
    if (preGenTimer.current) { clearTimeout(preGenTimer.current); preGenTimer.current = null; }
    if (preGenStatus.current === 'pending' || preGenStatus.current === 'running') {
      preGenAbort.current?.abort();
      fetch('/api/log-event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'fit_analysis_abandoned', preGenStatus: preGenStatus.current }) }).catch(() => {});
    }
    preGenStatus.current = 'idle';
    preGenBuffer.current = { resume: '', coverLetter: '', answers: [], applicationId: null, lastStatus: '' };
    originalResumeRef.current = '';
    setShowPdfView(true);
    setResetKey(k => k + 1);
    setUIState('idle');
    setStatusMessage('');
    setResumeContent('');
    setCoverLetterContent('');
    setFitAnalysis(null);
    setPendingFormData(null);
    setIncludeCoverLetter(false);
    setAdditionalContext([]);
    setErrorMessage('');
    setApplicationId(null);
    setCompany('');
    setJobTitle('');
    setJobDescription('');
    setJobUrl('');
    setUrlError('');
    setUrlImported(false);
    setManualExperience('');
    setQuestions(['']);
    setShortResponse(false);
    setQuestionsExpanded(false);
    setQuestionAnswers([]);
    setAnswersExpanded(true);
    setCopiedIdx(null);
    setPreviewType(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SignedIn>
          <TourGuide />
          <div className="space-y-8">
            {/* Header */}
            <div id="tour-heading" className="text-center">
              <h2 className="text-3xl font-bold text-foreground mb-3">Tailor My Resume</h2>
              <p className="text-muted-foreground">
                We&apos;ll do a comprehensive fit analysis based on your experience and then tailor your resume to match this specific role using your real experience — we never invent anything.
              </p>
              {billingStatus && billingStatus.subscription_status !== 'pro' && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {billingStatus.tailored_resume_count}/3 free resumes used
                  {' · '}
                  <Link href="/pricing" className="text-blue-500 hover:underline">Upgrade to Pro</Link>
                </p>
              )}
            </div>

            {/* Error Toast */}
            {uiState === 'error' && (
              <div className="p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
                <p>{errorMessage}</p>
                <Button variant="outline" size="sm" className="mt-2" onClick={resetForm}>
                  Try Again
                </Button>
              </div>
            )}

            {/* Fit Analysis Modal */}
            {uiState === 'review' && fitAnalysis && (
              <FitAnalysisModal
                fitAnalysis={fitAnalysis}
                company={pendingFormData?.company ?? ''}
                jobTitle={pendingFormData?.jobTitle ?? ''}
                onClose={resetForm}
                actions={
                  <div id="tour-generate" className="flex flex-col items-center sm:flex-row sm:items-stretch gap-3 pt-2">
                    <Button size="lg" className="sm:flex-1" onClick={handleGenerateDocuments}>
                      {includeCoverLetter ? 'Generate Resume & Cover Letter' : 'Generate Resume'}
                    </Button>
                    <Button variant="outline" size="lg" onClick={resetForm}>Start Over</Button>
                  </div>
                }
              />
            )}

            {/* Input Form */}
            {(uiState === 'idle' || uiState === 'analyzing' || uiState === 'error') && (
              <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-6">
                {IS_DEV && (
                  <div className="flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={fillTestData}>
                      [Dev] Fill Test Data
                    </Button>
                  </div>
                )}


                {/* 2. Job Description */}
                <div id="tour-job-details" className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea
                    id="jobDescription"
                    placeholder="Paste the full job description here..."
                    className="min-h-[280px] bg-background"
                    disabled={uiState === 'analyzing'}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    onPaste={handleJDPaste}
                  />
                  <p className="text-xs text-muted-foreground">Company and job title will auto-fill from the pasted text — double-check before submitting.</p>
                </div>

                {/* 2. Job URL import */}
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <Input
                      type="url"
                      placeholder="Or paste a job posting URL to import"
                      className="bg-background flex-1 h-9 text-sm"
                      disabled={uiState === 'analyzing' || isFetchingUrl}
                      value={jobUrl}
                      onChange={(e) => { setJobUrl(e.target.value); setUrlError(''); setUrlImported(false); }}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchUrl())}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleFetchUrl}
                      disabled={!jobUrl.trim() || uiState === 'analyzing' || isFetchingUrl}
                    >
                      {isFetchingUrl ? (
                        <span className="flex items-center gap-1.5">
                          <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-muted-foreground/30 border-t-foreground" />
                          Importing…
                        </span>
                      ) : 'Import'}
                    </Button>
                  </div>
                  {urlError && <p className="text-xs text-destructive">{urlError}</p>}
                  {urlImported
                    ? <p className="text-xs text-green-600">Imported — double-check auto-filled results before submitting.</p>
                    : <p className="text-xs text-muted-foreground">Works with Greenhouse, Lever, Workday, and a few others — LinkedIn and Indeed don&apos;t allow it.</p>
                  }
                </div>

                {/* 3. Company Name */}
                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <div className="relative">
                    <Input
                      id="company"
                      placeholder="Enter company name"
                      className="bg-background"
                      disabled={uiState === 'analyzing'}
                      required
                      value={company}
                      onChange={(e) => setCompany(e.target.value)}
                    />
                    {isParsingJD && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* 4. Job Title */}
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <div className="relative">
                    <Input
                      id="jobTitle"
                      placeholder="Enter job title"
                      className="bg-background"
                      disabled={uiState === 'analyzing'}
                      required
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                    {isParsingJD && (
                      <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>


                {/* 6. Application Questions */}
                <div id="tour-questions" className="border border-border rounded-xl overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuestionsExpanded(e => !e)}
                    disabled={uiState === 'analyzing'}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
                  >
                    <span>
                      {questionsExpanded ? '−' : '+'} Application Questions
                      {!questionsExpanded && questions.some(q => q.trim()) && (
                        <span className="ml-1.5 text-muted-foreground font-normal">
                          ({questions.filter(q => q.trim()).length} added)
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground font-normal">optional</span>
                  </button>

                  {questionsExpanded && (
                    <div className="px-5 pb-5 pt-1 space-y-4 border-t border-border">
                      <p className="text-xs text-muted-foreground pt-2">
                        Paste application questions and get AI-generated answers grounded in your real experience and context documents.
                      </p>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={shortResponse}
                          onChange={(e) => setShortResponse(e.target.checked)}
                          disabled={uiState === 'analyzing'}
                          className="w-4 h-4 rounded border-border accent-primary"
                        />
                        <span className="text-sm text-muted-foreground">Short response (2–3 sentences)</span>
                      </label>
                      {questions.map((q, i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-muted-foreground">Question {i + 1}</span>
                            <button
                              type="button"
                              onClick={() => removeQuestion(i)}
                              disabled={uiState === 'analyzing'}
                              className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                            >
                              {questions.length === 1 ? 'Clear' : 'Remove'}
                            </button>
                          </div>
                          <Textarea
                            placeholder="Paste question here..."
                            className="min-h-[72px] bg-background text-sm resize-none"
                            disabled={uiState === 'analyzing'}
                            value={q}
                            onChange={(e) => updateQuestion(i, e.target.value)}
                          />
                        </div>
                      ))}
                      {questions.length < 5 && (
                        <button
                          type="button"
                          onClick={addQuestion}
                          disabled={uiState === 'analyzing'}
                          className="text-sm text-primary hover:underline"
                        >
                          + Add another question
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. Toggles + Generate */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center">
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeSummary}
                        onChange={(e) => setIncludeSummary(e.target.checked)}
                        disabled={uiState === 'analyzing'}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm text-muted-foreground">Include a summary section</span>
                    </label>
                    <label className="flex items-center gap-2.5 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeCoverLetter}
                        onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                        disabled={uiState === 'analyzing'}
                        className="w-4 h-4 rounded border-border accent-primary"
                      />
                      <span className="text-sm text-muted-foreground">Also generate a cover letter</span>
                    </label>
                  </div>

                  <Button
                    id="tour-generate"
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto px-12 py-3 text-lg"
                    disabled={uiState === 'analyzing'}
                  >
                    {uiState === 'analyzing' ? 'Analyzing…' : 'Tailor My Resume'}
                  </Button>

                  <div id="tour-background" className="w-full">
                    <ExperiencePanel
                      key={resetKey}
                      onBackgroundChange={(text) => { setManualExperience(text); setUsingBaseResume(false); }}
                      onAdditionalContextChange={setAdditionalContext}
                      disabled={uiState === 'analyzing'}
                      usingBaseResume={usingBaseResume}
                    />
                  </div>

                  {uiState === 'analyzing' && (
                    <div ref={analyzingRef} className="w-full max-w-lg p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600 shrink-0" />
                        <p className="text-sm font-medium text-blue-900">Analyzing your fit for this role…</p>
                      </div>
                      <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" style={{ width: '15%' }} />
                      </div>
                    </div>
                  )}
                </div>
              </form>
            )}

            {/* Progress Indicator — generating phase */}
            {uiState === 'generating' && (
              <div className="p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
                {(() => {
                  const hasQs = questions.some(q => q.trim());
                  const steps = [
                    { label: 'Generating resume', done: statusMessage.toLowerCase().includes('cover') || statusMessage.toLowerCase().includes('answering') || statusMessage.toLowerCase().includes('saving') || statusMessage.toLowerCase().includes('complete') },
                    ...(includeCoverLetter ? [{ label: 'Writing cover letter', done: statusMessage.toLowerCase().includes('answering') || statusMessage.toLowerCase().includes('saving') || statusMessage.toLowerCase().includes('complete') }] : []),
                    ...(hasQs ? [{ label: 'Answering questions', done: statusMessage.toLowerCase().includes('saving') || statusMessage.toLowerCase().includes('complete') }] : []),
                    { label: 'Saving', done: statusMessage.toLowerCase().includes('complete') },
                  ];
                  const doneCount = steps.filter(s => s.done).length;
                  const pct = Math.round((doneCount / steps.length) * 100);
                  const currentStep = Math.min(doneCount, steps.length - 1);
                  return (
                    <>
                      <div className="flex items-center gap-3">
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600 shrink-0" />
                        <p className="text-sm font-medium text-blue-900">{statusMessage || 'Working…'}</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-blue-700">
                          <span>Step {doneCount + 1} of {steps.length}</span>
                          <span>{pct}%</span>
                        </div>
                        <div className="h-1.5 bg-blue-200 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.max(pct, 20)}%` }} />
                        </div>
                        <div className="flex gap-4 mt-1 flex-wrap">
                          {steps.map((s, i) => (
                            <span key={i} className={`text-xs flex items-center gap-1 ${s.done ? 'text-blue-600' : i === currentStep ? 'text-blue-900 font-semibold' : 'text-blue-400'}`}>
                              {s.done ? '✓' : i === currentStep ? '›' : '·'} {s.label}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            {/* Top action bar — shown once generation is done */}
            {uiState === 'done' && (resumeContent || coverLetterContent) && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" onClick={() => handleDownload('resume')}>
                    <Download className="w-3.5 h-3.5 mr-1.5" />Download Resume
                  </Button>
                  {includeCoverLetter && coverLetterContent && (
                    <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter')}>
                      <Download className="w-3.5 h-3.5 mr-1.5" />Download Cover Letter
                    </Button>
                  )}
                </div>
                <Button size="sm" variant="outline" onClick={resetForm}>
                  <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Tailor New Resume
                </Button>
              </div>
            )}

            {/* Live Preview Panels */}
            {(uiState === 'generating' || uiState === 'done') && (resumeContent || coverLetterContent) && (
              <div className={`grid grid-cols-1 ${includeCoverLetter ? 'lg:grid-cols-2' : ''} gap-8`}>
                {resumeContent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Resume</h3>
                      {uiState === 'done' && (
                        <div className="flex items-center gap-3">
                          <Button size="sm" variant="outline" onClick={() => handleDownload('resume')}>
                            <Download className="w-3.5 h-3.5 mr-1.5" />Download PDF
                          </Button>
                          <button
                            onClick={() => setShowPdfView(v => !v)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPdfView ? 'Edit text' : 'PDF view'}
                          </button>
                        </div>
                      )}
                    </div>
                    {uiState === 'done' && showPdfView ? (
                      <InlinePDFViewer
                        type="resume"
                        text={resumeContent}
                        candidateName={candidateName}
                        company={company}
                        jobTitle={jobTitle}
                      />
                    ) : (
                      <Textarea
                        value={resumeContent}
                        onChange={(e) => setResumeContent(e.target.value)}
                        className="min-h-96 bg-muted font-mono text-sm resize-y"
                        readOnly={uiState === 'generating'}
                      />
                    )}
                  </div>
                )}
                {includeCoverLetter && coverLetterContent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Cover Letter</h3>
                      {uiState === 'done' && (
                        <div className="flex items-center gap-3">
                          <Button size="sm" variant="outline" onClick={() => handleDownload('cover-letter')}>
                            <Download className="w-3.5 h-3.5 mr-1.5" />Download PDF
                          </Button>
                          <button
                            onClick={() => setShowPdfView(v => !v)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            {showPdfView ? 'Edit text' : 'PDF view'}
                          </button>
                        </div>
                      )}
                    </div>
                    {uiState === 'done' && showPdfView ? (
                      <InlinePDFViewer
                        type="cover-letter"
                        text={coverLetterContent}
                        candidateName={candidateName}
                        company={company}
                        jobTitle={jobTitle}
                      />
                    ) : (
                      <Textarea
                        value={coverLetterContent}
                        onChange={(e) => setCoverLetterContent(e.target.value)}
                        className="min-h-96 bg-muted font-mono text-sm resize-y"
                        readOnly={uiState === 'generating'}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Bottom action bar */}
            {uiState === 'done' && (
              <div className="flex flex-col items-center gap-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button size="lg" onClick={() => handleDownload('resume')} className="px-8">
                    <Download className="w-4 h-4 mr-2" />Download Resume PDF
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setPreviewType('resume')}>
                    <Eye className="w-4 h-4 mr-2" />Preview
                  </Button>
                  {includeCoverLetter && coverLetterContent && (
                    <>
                      <Button size="lg" onClick={() => handleDownload('cover-letter')} className="px-8">
                        <Download className="w-4 h-4 mr-2" />Download Cover Letter PDF
                      </Button>
                      <Button size="lg" variant="outline" onClick={() => setPreviewType('cover-letter')}>
                        <Eye className="w-4 h-4 mr-2" />Preview
                      </Button>
                    </>
                  )}
                </div>
                <Button variant="outline" onClick={resetForm}>
                  <RotateCcw className="w-4 h-4 mr-2" />Tailor New Resume
                </Button>
              </div>
            )}

            {/* PDF Preview Modals */}
            {previewType === 'resume' && resumeContent && (
              <PDFPreviewModal
                type="resume"
                resumeText={resumeContent}
                candidateName={candidateName}
                company={company}
                jobTitle={jobTitle}
                onClose={() => setPreviewType(null)}
              />
            )}
            {previewType === 'cover-letter' && coverLetterContent && (
              <PDFPreviewModal
                type="cover-letter"
                coverLetterText={coverLetterContent}
                candidateName={candidateName}
                company={company}
                jobTitle={jobTitle}
                onClose={() => setPreviewType(null)}
              />
            )}

            {/* Application Answers Panel */}
            {uiState === 'done' && questionAnswers.length > 0 && (
              <div className="mt-8 border border-border rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setAnswersExpanded(e => !e)}
                  className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-foreground hover:bg-muted/50 transition-colors"
                >
                  <span>Application Answers ({questionAnswers.length})</span>
                  <span className="text-muted-foreground">{answersExpanded ? '▲' : '▼'}</span>
                </button>
                {answersExpanded && (
                  <div className="divide-y divide-border border-t border-border">
                    {questionAnswers.map((qa, i) => (
                      <div key={i} className="px-5 py-4 space-y-2">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-sm font-medium text-foreground">{qa.question}</p>
                          <span className="text-xs text-muted-foreground shrink-0">
                            {qa.answer.trim().split(/\s+/).filter(Boolean).length} words
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground whitespace-pre-wrap">{qa.answer}</p>
                        <button
                          type="button"
                          onClick={() => copyAnswer(qa.answer, i)}
                          className="text-xs text-primary hover:underline"
                        >
                          {copiedIdx === i ? 'Copied!' : 'Copy Answer'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Interview Prep Section */}
            {uiState === 'done' && applicationId && resumeContent && (
              <InterviewPrepSection
                applicationId={applicationId}
                jobTitle={jobTitle}
                company={company}
                jobDescription={jobDescription}
                generatedResume={resumeContent}
                toughQuestions={questionAnswers.length > 0 ? questionAnswers.map(qa => qa.question) : undefined}
              />
            )}

            {/* Resume Chat */}
            {uiState === 'done' && applicationId && resumeContent && (
              <ResumeChatPanel
                applicationId={applicationId}
                currentResumeText={resumeContent}
                originalResumeText={originalResumeRef.current}
                coverLetterText={coverLetterContent || undefined}
                jobDescription={jobDescription}
                company={company}
                jobTitle={jobTitle}
                backgroundExperience={pendingFormData?.backgroundExperience}
                onResumeUpdate={setResumeContent}
              />
            )}
          </div>
        </SignedIn>
      </main>

      {/* Upgrade modal — shown when free limit hit */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="relative bg-card border border-border rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-foreground">You&apos;ve used your 3 free resumes</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-6">
              Upgrade to Pro for unlimited tailored resumes, cover letters, interview prep, and more.
            </p>

            <div className="space-y-3 mb-6">
              <Button
                className="w-full"
                disabled={upgradeLoading !== null}
                onClick={() => handleUpgrade('monthly')}
              >
                {upgradeLoading === 'monthly' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Monthly — $19/mo
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={upgradeLoading !== null}
                onClick={() => handleUpgrade('quarterly')}
              >
                {upgradeLoading === 'quarterly' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Quarterly — $47/3 months · Save 18%
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={upgradeLoading !== null}
                onClick={() => handleUpgrade('annual')}
              >
                {upgradeLoading === 'annual' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Annual — $149/yr · Best Value · Save 35%
              </Button>
            </div>

            <Link href="/pricing" className="text-sm text-blue-500 hover:underline block text-center">
              View all features →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
