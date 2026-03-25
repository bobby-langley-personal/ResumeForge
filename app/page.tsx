'use client';

import { useState, useRef, useEffect } from 'react';
import { SignedIn, SignedOut, SignInButton, useUser } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSSEStream } from '@/lib/sse-reader';
import { Upload, FileText, ChevronDown, ChevronUp, Loader2, Eye } from 'lucide-react';
import { FitAnalysis } from '@/types/fit-analysis';
import { ResumeItem } from '@/types/resume';
import ContextSelector from '@/components/ContextSelector';
import TourGuide from '@/components/TourGuide';
import FitAnalysisModal from '@/components/FitAnalysisModal';
import { InterviewPrepSection } from '@/components/InterviewPrepPanel';
import ResumeChatPanel from '@/components/ResumeChatPanel';

const PDFPreviewModal = dynamic(() => import('@/components/PDFPreviewModal'), { ssr: false });

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
  const candidateName = user?.fullName ?? user?.firstName ?? '';
  const [uiState, setUIState] = useState<UIState>('idle');
  const [resetKey, setResetKey] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMethod, setInputMethod] = useState<'upload' | 'manual'>('upload');
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
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [pendingSaveFile, setPendingSaveFile] = useState<{ text: string; fileName: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const originalResumeRef = useRef('');

  // Capture original resume text the first time generation completes
  useEffect(() => {
    if (uiState === 'done' && resumeContent && !originalResumeRef.current) {
      originalResumeRef.current = resumeContent;
    }
  }, [uiState, resumeContent]);

  // Pre-generation refs — background generation starts 500ms after fit analysis
  type PreGenStatus = 'idle' | 'pending' | 'running' | 'done' | 'aborted';
  const preGenStatus = useRef<PreGenStatus>('idle');
  const preGenTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const preGenAbort = useRef<AbortController | null>(null);
  const preGenBuffer = useRef({ resume: '', coverLetter: '', answers: [] as { question: string; answer: string }[], applicationId: null as string | null, lastStatus: '' });

  const fillTestData = () => {
    setInputMethod('manual');
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
      .then((data: { company?: string | null; jobTitle?: string | null } | null) => {
        if (data?.company) setCompany(data.company);
        if (data?.jobTitle) setJobTitle(data.jobTitle);
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/extract-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }

      const result = await response.json();
      setUploadedFileContent(result.text);
      setUploadedFileName(result.fileName);
      setIsPreviewExpanded(true);
      setPendingSaveFile({ text: result.text, fileName: result.fileName });
      setShowSaveModal(true);

    } catch (error) {
      console.error('File upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract text from file');
      setUIState('error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveToDocuments = async () => {
    if (!pendingSaveFile) return;
    setShowSaveModal(false);
    const title = pendingSaveFile.fileName.replace(/\.[^.]+$/, ''); // strip extension
    await fetch('/api/resumes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        content: { text: pendingSaveFile.text, fileName: pendingSaveFile.fileName },
        item_type: 'resume',
        is_default: false,
      }),
    });
    setPendingSaveFile(null);
    setResetKey(k => k + 1); // re-mount ContextSelector so the new doc appears
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const data: FormData = {
      company,
      jobTitle,
      jobDescription,
      backgroundExperience: inputMethod === 'upload' && uploadedFileContent
        ? uploadedFileContent
        : manualExperience,
      isFromUploadedFile: inputMethod === 'upload' && !!uploadedFileContent,
    };

    if (!data.company || !data.jobTitle || !data.jobDescription || !data.backgroundExperience) {
      setErrorMessage('Please fill in all fields and provide your background (upload a file, paste text, or load from My Documents)');
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

    // Pre-gen already finished — use buffer instantly
    if (preGenStatus.current === 'done') {
      setResumeContent(preGenBuffer.current.resume);
      setCoverLetterContent(preGenBuffer.current.coverLetter);
      setQuestionAnswers(preGenBuffer.current.answers);
      if (preGenBuffer.current.applicationId) setApplicationId(preGenBuffer.current.applicationId);
      setStatusMessage('Generation complete!');
      setUIState('done');
      return;
    }

    // Pre-gen is mid-stream — poll buffer into state until done
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
          setErrorMessage('Generation failed. Please try again.');
          setUIState('error');
        }
      }, 50);
      return;
    }

    // Pre-gen not started or aborted — fall through to normal generation
    preGenStatus.current = 'aborted';

    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingFormData, fitAnalysis, includeCoverLetter, includeSummary, jobUrl: jobUrl.trim() || undefined, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })), questions: questions.filter(q => q.trim()), shortResponse }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      for await (const chunk of readSSEStream(response)) {
        try {
          const event = JSON.parse(chunk);

          switch (event.type) {
            case 'status':
              setStatusMessage(event.message);
              break;
            case 'resume_chunk':
              setResumeContent(prev => prev + event.content);
              break;
            case 'resume_done':
              if (includeCoverLetter) setStatusMessage('Writing cover letter...');
              else if (questions.some(q => q.trim())) setStatusMessage('Answering questions...');
              else setStatusMessage('Saving...');
              break;
            case 'cover_letter_chunk':
              setCoverLetterContent(prev => prev + event.content);
              break;
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
              if (event.applicationId) {
                setApplicationId(event.applicationId);
              }
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
      const filename = filenameMatch?.[1] || `${type}.pdf`;

      a.download = filename;
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
    setUploadedFileContent('');
    setUploadedFileName('');
    setIsPreviewExpanded(false);
    setInputMethod('upload');
    setQuestions(['']);
    setShortResponse(false);
    setQuestionsExpanded(false);
    setQuestionAnswers([]);
    setAnswersExpanded(true);
    setCopiedIdx(null);
    setPreviewType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SignedOut>
          <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center">
            <div className="text-center space-y-6">
              <h2 className="text-3xl font-bold text-foreground mb-4">Welcome to ResumeForge</h2>
              <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
                AI-powered resume and cover letter generator. Create tailored documents for every job application.
              </p>
              <SignInButton>
                <Button size="lg">Sign In to Get Started</Button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        <SignedIn>
          <TourGuide />
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div id="tour-heading" className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Get To Work</h2>
              <p className="text-lg text-muted-foreground">
                Paste a job description, upload your resume, and 
get an AI-tailored, ATS-optimized resume and cover letter in seconds.
              </p>
              <p className="text-md text-muted-foreground">
                *Note: For the best experience, use this on a PC browser.
              </p>
            </div>

            {/* Error Toast */}
            {uiState === 'error' && (
              <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
                <p>{errorMessage}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={resetForm}
                  title="Clear the error and start over"
                >
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
                  <div id="tour-generate" className="flex flex-col sm:flex-row gap-3 pt-2">
                    <Button size="lg" className="flex-1" onClick={handleGenerateDocuments} title="Generate your tailored resume based on the fit analysis">
                      {includeCoverLetter ? 'Generate Resume & Cover Letter' : 'Generate Resume'}
                    </Button>
                    <Button variant="outline" size="lg" onClick={resetForm} title="Discard and start over with a new job description">Start Over</Button>
                  </div>
                }
              />
            )}

            {/* Input Form */}
            {(uiState === 'idle' || uiState === 'analyzing' || uiState === 'error') && (
              <form ref={formRef} onSubmit={handleFormSubmit}>
                {IS_DEV && (
                  <div className="mb-6 flex justify-end">
                    <Button type="button" variant="outline" size="sm" onClick={fillTestData}>
                      [Dev] Fill Test Data
                    </Button>
                  </div>
                )}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                  {/* Left Column - Job Details */}
                  <div id="tour-job-details" className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Job Details</h3>

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

                    <div className="space-y-2">
                      <Label htmlFor="jobDescription">Job Description</Label>
                      <Textarea
                        id="jobDescription"
                        placeholder="Paste the full job description here..."
                        className="min-h-[300px] bg-background"
                        disabled={uiState === 'analyzing'}
                        required
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        onPaste={handleJDPaste}
                      />
                      <p className="text-xs text-muted-foreground">Company and job title will auto-fill from the pasted text — double-check before submitting.</p>
                    </div>

                    <details className="group">
                      <summary className="text-xs text-muted-foreground hover:text-foreground cursor-pointer list-none flex items-center gap-1 select-none">
                        <span className="group-open:rotate-90 transition-transform inline-block">›</span>
                        Import from URL instead
                      </summary>
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2">
                          <Input
                            id="jobUrl"
                            type="url"
                            placeholder="https://jobs.example.com/posting/123"
                            className="bg-background flex-1"
                            disabled={uiState === 'analyzing' || isFetchingUrl}
                            value={jobUrl}
                            onChange={(e) => { setJobUrl(e.target.value); setUrlError(''); setUrlImported(false); }}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleFetchUrl())}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleFetchUrl}
                            disabled={!jobUrl.trim() || uiState === 'analyzing' || isFetchingUrl}
                            title="Fetch and extract the job description from this URL"
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
                          ? <p className="text-xs text-green-600">Imported — always double-check auto-filled results for accuracy.</p>
                          : <p className="text-xs text-muted-foreground">Works best with public job postings. Some sites may block automated requests.</p>
                        }
                      </div>
                    </details>

                    {/* Application Questions */}
                    <div id="tour-questions" className="border border-border rounded-xl overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setQuestionsExpanded(e => !e)}
                        disabled={uiState === 'analyzing'}
                        title="Add optional application questions to get AI-generated answers"
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
                                  title={questions.length === 1 ? 'Clear this question' : 'Remove this question'}
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
                              title="Add another application question (max 5)"
                              className="text-sm text-primary hover:underline"
                            >
                              + Add another question
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Your Background */}
                  <div id="tour-background" className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Background</h3>

                    <ContextSelector
                      key={resetKey}
                      onLoadBackground={text => { setInputMethod('manual'); setManualExperience(text); }}
                      onAdditionalContextChange={setAdditionalContext}
                      disabled={uiState === 'analyzing'}
                    />

                    <div id="tour-experience" className="flex space-x-4 mb-6">
                      <Button
                        id="tour-upload-btn"
                        type="button"
                        variant={inputMethod === 'upload' ? 'default' : 'outline'}
                        onClick={() => { setInputMethod('upload'); fileInputRef.current?.click(); }}
                        disabled={uiState === 'analyzing'}
                        title="Upload a PDF or DOCX resume — text will be extracted automatically"
                        className="flex items-center space-x-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Upload Resume</span>
                      </Button>
                      <Button
                        type="button"
                        variant={inputMethod === 'manual' ? 'default' : 'outline'}
                        onClick={() => setInputMethod('manual')}
                        disabled={uiState === 'analyzing'}
                        title="Paste your resume or work experience as plain text"
                        className="flex items-center space-x-2"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Paste Text</span>
                      </Button>
                    </div>

                    {inputMethod === 'upload' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="resumeFile">Upload your existing resume</Label>
                          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors">
                            <input
                              ref={fileInputRef}
                              type="file"
                              id="resumeFile"
                              accept=".pdf,.docx"
                              onChange={handleFileUpload}
                              disabled={uiState === 'analyzing' || isUploading}
                              className="hidden"
                            />
                            <label
                              htmlFor="resumeFile"
                              className="cursor-pointer flex flex-col items-center space-y-2"
                            >
                              <Upload className="w-8 h-8 text-muted-foreground" />
                              <div className="text-center">
                                <p className="text-sm font-medium">
                                  {isUploading ? 'Processing file...' : 'Click to upload or drag and drop'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  PDF or DOCX files up to 5MB
                                </p>
                              </div>
                            </label>
                          </div>
                        </div>

                        {uploadedFileName && uploadedFileContent && (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>Extracted content from {uploadedFileName}</Label>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsPreviewExpanded(!isPreviewExpanded)}
                                className="flex items-center space-x-1"
                                title={isPreviewExpanded ? 'Collapse extracted text' : 'Expand to view and edit extracted text'}
                              >
                                <span>{isPreviewExpanded ? 'Collapse' : 'Expand'}</span>
                                {isPreviewExpanded ? (
                                  <ChevronUp className="w-4 h-4" />
                                ) : (
                                  <ChevronDown className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            {isPreviewExpanded && (
                              <Textarea
                                value={uploadedFileContent}
                                onChange={(e) => setUploadedFileContent(e.target.value)}
                                placeholder="Extracted text will appear here..."
                                className="min-h-[300px] bg-background font-mono text-sm"
                                disabled={uiState === 'analyzing'}
                              />
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {inputMethod === 'manual' && (
                      <div className="space-y-2">
                        <Label htmlFor="experience">Or paste your experience manually</Label>
                        <Textarea
                          id="experience"
                          placeholder="Paste your current resume or background experience here..."
                          className="min-h-[400px] bg-background"
                          disabled={uiState === 'analyzing'}
                          required
                          value={manualExperience}
                          onChange={(e) => setManualExperience(e.target.value)}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col items-center space-y-4 mb-6">
                  {/* Summary toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeSummary}
                      onChange={(e) => setIncludeSummary(e.target.checked)}
                      disabled={uiState === 'analyzing'}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">Include a summary section</span>
                  </label>
                  {/* Cover letter toggle */}
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={includeCoverLetter}
                      onChange={(e) => setIncludeCoverLetter(e.target.checked)}
                      disabled={uiState === 'analyzing'}
                      className="w-4 h-4 rounded border-border accent-primary"
                    />
                    <span className="text-sm text-muted-foreground">Also generate a cover letter</span>
                  </label>

                  <Button
                    type="submit"
                    size="lg"
                    className="px-12 py-3 text-lg"
                    disabled={uiState === 'analyzing'}
                  >
                    {uiState === 'analyzing' ? 'Analyzing...' : 'Analyze Fit'}
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    We&apos;ll analyze your fit before generating your documents
                  </p>

                  {/* Progress Indicator — analyzing phase */}
                  {uiState === 'analyzing' && (
                    <div className="w-full max-w-lg p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
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
              <div className="mb-6 p-5 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
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
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all duration-700 ease-out"
                            style={{ width: `${Math.max(pct, 20)}%` }}
                          />
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

            {/* Live Preview Panels */}
            {(uiState === 'generating' || uiState === 'done') && (resumeContent || coverLetterContent) && (
              <div className={`grid grid-cols-1 ${includeCoverLetter ? 'lg:grid-cols-2' : ''} gap-8 mb-8`}>
                {resumeContent && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-foreground">Resume</h3>
                      {uiState === 'done' && (
                        <span className="text-xs text-muted-foreground">Editable</span>
                      )}
                    </div>
                    <Textarea
                      value={resumeContent}
                      onChange={(e) => setResumeContent(e.target.value)}
                      className="min-h-96 bg-muted font-mono text-sm resize-y"
                      readOnly={uiState === 'generating'}
                    />
                  </div>
                )}

                {includeCoverLetter && coverLetterContent && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-foreground">Cover Letter</h3>
                    <Textarea
                      value={coverLetterContent}
                      onChange={(e) => setCoverLetterContent(e.target.value)}
                      className="min-h-96 bg-muted font-mono text-sm resize-y"
                      readOnly={uiState === 'generating'}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Download + Preview Buttons */}
            {uiState === 'done' && (
              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <div className="flex gap-2">
                    <Button
                      size="lg"
                      onClick={() => handleDownload('resume')}
                      className="px-8"
                      title="Download your tailored resume as a PDF"
                    >
                      Download Resume PDF
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => setPreviewType('resume')}
                      title="Preview Resume"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                  {includeCoverLetter && coverLetterContent && (
                    <div className="flex gap-2">
                      <Button
                        size="lg"
                        onClick={() => handleDownload('cover-letter')}
                        className="px-8"
                        title="Download your cover letter as a PDF"
                      >
                        Download Cover Letter PDF
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setPreviewType('cover-letter')}
                        title="Preview Cover Letter"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="mt-4"
                  title="Clear all results and start a new resume from scratch"
                >
                  Start Fresh
                </Button>
              </div>
            )}

            {/* Save to Documents Modal */}
            {showSaveModal && pendingSaveFile && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveModal(false)} />
                <div className="relative bg-background border border-border rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
                  <h2 className="text-base font-semibold text-foreground">Save to your profile?</h2>
                  <p className="text-sm text-muted-foreground">
                    Save <span className="font-medium text-foreground">{pendingSaveFile.fileName}</span> to My Documents so it auto-loads next time.
                  </p>
                  <div className="flex gap-3">
                    <button
                      onClick={handleSaveToDocuments}
                      className="flex-1 h-9 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                      title="Save this document to My Documents for future use"
                    >
                      Yes, save it
                    </button>
                    <button
                      onClick={() => { setShowSaveModal(false); setPendingSaveFile(null); }}
                      className="flex-1 h-9 rounded-md border border-border text-sm text-foreground hover:bg-muted transition-colors"
                      title="Skip saving — you can always download directly"
                    >
                      No thanks
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* PDF Preview Modal (home page) */}
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
                  title={answersExpanded ? 'Collapse application answers' : 'Expand to view AI-generated application answers'}
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
                          title="Copy this answer to clipboard"
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
    </div>
  );
}
