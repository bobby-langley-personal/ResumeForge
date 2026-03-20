'use client';

import { useState, useRef } from 'react';
import { SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSSEStream } from '@/lib/sse-reader';
import { Upload, FileText, ChevronDown, ChevronUp, X } from 'lucide-react';
import { FitAnalysis } from '@/types/fit-analysis';
import { ResumeItem } from '@/types/resume';
import ContextSelector from '@/components/ContextSelector';

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

const FIT_COLORS: Record<string, string> = {
  'Strong Fit': 'text-green-700 bg-green-50 border-green-200',
  'Good Fit': 'text-blue-700 bg-blue-50 border-blue-200',
  'Stretch Role': 'text-amber-700 bg-amber-50 border-amber-200',
};

export default function Home() {
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
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [manualExperience, setManualExperience] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fillTestData = () => {
    setInputMethod('manual');
    setCompany('Kforce / Fintech Client');
    setJobTitle('Technical Support Specialist');
    setJobDescription(DEV_JD);
    setManualExperience(DEV_RESUME);
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

    } catch (error) {
      console.error('File upload failed:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Failed to extract text from file');
      setUIState('error');
    } finally {
      setIsUploading(false);
    }
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
      setErrorMessage('Please fill in all fields and provide your background (upload a file, paste text, or load from library)');
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
        body: JSON.stringify({ ...data, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })) }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const analysis: FitAnalysis = await response.json();
      setFitAnalysis(analysis);
      setUIState('review');
    } catch (error) {
      console.error('Analysis failed:', error);
      setErrorMessage('Failed to analyze fit. Please try again.');
      setUIState('error');
    }
  };

  const handleGenerateDocuments = async () => {
    if (!pendingFormData || !fitAnalysis) return;

    setUIState('generating');
    setStatusMessage('Starting generation...');
    setResumeContent('');
    setCoverLetterContent('');

    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...pendingFormData, fitAnalysis, includeCoverLetter, additionalContext: additionalContext.map(i => ({ title: i.title, type: i.item_type, text: i.content.text })) }),
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
              setStatusMessage('Writing cover letter...');
              break;
            case 'cover_letter_chunk':
              setCoverLetterContent(prev => prev + event.content);
              break;
            case 'cover_letter_done':
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
    setManualExperience('');
    setUploadedFileContent('');
    setUploadedFileName('');
    setIsPreviewExpanded(false);
    setInputMethod('upload');
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
          <div className="max-w-6xl mx-auto">
            {/* Header */}
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-foreground mb-4">Generate Your Documents</h2>
              <p className="text-lg text-muted-foreground">
                Paste a job description and your background to get started
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
                >
                  Try Again
                </Button>
              </div>
            )}

            {/* Progress Indicator */}
            {(uiState === 'analyzing' || uiState === 'generating') && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-blue-800">
                    {uiState === 'analyzing' ? 'Analyzing your fit for this role...' : statusMessage}
                  </p>
                </div>
              </div>
            )}

            {/* Fit Analysis Modal */}
            {uiState === 'review' && fitAnalysis && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                  <div className="p-6 space-y-6">
                    {/* Modal Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Fit Analysis</h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          {pendingFormData?.jobTitle} at {pendingFormData?.company}
                        </p>
                      </div>
                      <button
                        onClick={resetForm}
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Overall Fit Badge */}
                    <div className={`inline-flex items-center px-4 py-2 rounded-full border text-sm font-semibold ${FIT_COLORS[fitAnalysis.overallFit] ?? 'text-foreground bg-muted border-border'}`}>
                      {fitAnalysis.overallFit}
                    </div>

                    {/* Strengths / Gaps / Suggestions */}
                    <div className="grid grid-cols-1 gap-4">
                      <div>
                        <h3 className="text-sm font-semibold text-green-700 mb-2">Strengths</h3>
                        <ul className="space-y-1">
                          {fitAnalysis.strengths.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-green-600 mt-0.5">✓</span>
                              <span>
                                {s.point}
                                {s.source && <span className="text-xs text-muted-foreground/60 ml-1">({s.source})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-red-700 mb-2">Gaps</h3>
                        <ul className="space-y-1">
                          {fitAnalysis.gaps.map((g, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-red-500 mt-0.5">✗</span>
                              <span>
                                {g.point}
                                {g.source && <span className="text-xs text-muted-foreground/60 ml-1">({g.source})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-blue-700 mb-2">Suggestions</h3>
                        <ul className="space-y-1">
                          {fitAnalysis.suggestions.map((s, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-blue-500 mt-0.5">→</span>
                              <span>
                                {s.point}
                                {s.source && <span className="text-xs text-muted-foreground/60 ml-1">({s.source})</span>}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {fitAnalysis.plannedImprovements?.length > 0 && (
                        <div>
                          <h3 className="text-sm font-semibold text-orange-600 mb-2">Planned Improvements</h3>
                          <ul className="space-y-1">
                            {fitAnalysis.plannedImprovements.map((p, i) => (
                              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                <span className="text-orange-500 mt-0.5">✦</span>
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <Button
                        size="lg"
                        className="flex-1"
                        onClick={handleGenerateDocuments}
                      >
                        {includeCoverLetter ? 'Generate Resume & Cover Letter' : 'Generate Resume'}
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        onClick={resetForm}
                      >
                        Start Over
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
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
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Job Details</h3>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        placeholder="Enter company name"
                        className="bg-background"
                        disabled={uiState === 'analyzing'}
                        required
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="jobTitle">Job Title</Label>
                      <Input
                        id="jobTitle"
                        placeholder="Enter job title"
                        className="bg-background"
                        disabled={uiState === 'analyzing'}
                        required
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                      />
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
                      />
                    </div>
                  </div>

                  {/* Right Column - Your Background */}
                  <div className="space-y-6">
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Background</h3>

                    <ContextSelector
                      key={resetKey}
                      onLoadBackground={text => { setInputMethod('manual'); setManualExperience(text); }}
                      onAdditionalContextChange={setAdditionalContext}
                      disabled={uiState === 'analyzing'}
                    />

                    <div className="flex space-x-4 mb-6">
                      <Button
                        type="button"
                        variant={inputMethod === 'upload' ? 'default' : 'outline'}
                        onClick={() => { setInputMethod('upload'); fileInputRef.current?.click(); }}
                        disabled={uiState === 'analyzing'}
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

                <div className="flex flex-col items-center space-y-4 mb-8">
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
                </div>
              </form>
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

            {/* Download Buttons */}
            {uiState === 'done' && (
              <div className="text-center space-y-4">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    onClick={() => handleDownload('resume')}
                    className="px-8"
                  >
                    Download Resume PDF
                  </Button>
                  {includeCoverLetter && coverLetterContent && (
                  <Button
                    size="lg"
                    onClick={() => handleDownload('cover-letter')}
                    className="px-8"
                  >
                    Download Cover Letter PDF
                  </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={resetForm}
                  className="mt-4"
                >
                  Generate New Documents
                </Button>
              </div>
            )}
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
