'use client';

import { useState, useRef } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSSEStream } from '@/lib/sse-reader';
import { Upload, FileText, ChevronDown, ChevronUp } from 'lucide-react';
import { FitAnalysis } from '@/types/fit-analysis';

type UIState = 'idle' | 'generating' | 'done' | 'error';

interface FormData {
  company: string;
  jobTitle: string;
  jobDescription: string;
  backgroundExperience: string;
  isFromUploadedFile?: boolean;
}

export default function Home() {
  const [uiState, setUIState] = useState<UIState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [fitAnalysis, setFitAnalysis] = useState<FitAnalysis | null>(null);
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [uploadedFileContent, setUploadedFileContent] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMethod, setInputMethod] = useState<'upload' | 'manual'>('upload');
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data: FormData = {
      company: formData.get('company') as string,
      jobTitle: formData.get('jobTitle') as string,
      jobDescription: formData.get('jobDescription') as string,
      backgroundExperience: inputMethod === 'upload' && uploadedFileContent 
        ? uploadedFileContent 
        : formData.get('experience') as string,
      isFromUploadedFile: inputMethod === 'upload' && !!uploadedFileContent,
    };

    // Validate form data
    if (!data.company || !data.jobTitle || !data.jobDescription || !data.backgroundExperience) {
      if (inputMethod === 'upload' && !uploadedFileContent) {
        setErrorMessage('Please fill in all job details and upload a resume file');
      } else {
        setErrorMessage('Please fill in all fields');
      }
      setUIState('error');
      return;
    }

    setUIState('generating');
    setStatusMessage('Starting generation...');
    setResumeContent('');
    setCoverLetterContent('');
    setFitAnalysis(null);
    setErrorMessage('');

    try {
      const response = await fetch('/api/generate-documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

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
            case 'analysis':
              setFitAnalysis(event.data);
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ applicationId }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from Content-Disposition header or use default
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
    setUIState('idle');
    setStatusMessage('');
    setResumeContent('');
    setCoverLetterContent('');
    setFitAnalysis(null);
    setErrorMessage('');
    setApplicationId(null);
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
      {/* Top Navbar */}
      <nav className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-foreground">ResumeForge</h1>
            </div>
            
            {/* User Menu */}
            <div className="flex items-center">
              <SignedOut>
                <SignInButton>
                  <Button variant="outline">Sign In</Button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <UserButton 
                  appearance={{
                    elements: {
                      userButtonAvatarBox: "w-10 h-10",
                      userButtonPopoverCard: "bg-popover border-border",
                      userButtonPopoverText: "text-popover-foreground"
                    }
                  }}
                />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

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
            {uiState === 'generating' && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <p className="text-blue-800">{statusMessage}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form ref={formRef} onSubmit={handleFormSubmit}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Left Column - Job Details */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">Job Details</h3>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input 
                      id="company"
                      name="company"
                      placeholder="Enter company name"
                      className="bg-background"
                      disabled={uiState === 'generating'}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input 
                      id="jobTitle"
                      name="jobTitle"
                      placeholder="Enter job title"
                      className="bg-background"
                      disabled={uiState === 'generating'}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <Textarea 
                      id="jobDescription"
                      name="jobDescription"
                      placeholder="Paste the full job description here..."
                      className="min-h-[300px] bg-background"
                      disabled={uiState === 'generating'}
                      required
                    />
                  </div>
                </div>

                {/* Right Column - Your Background */}
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-4">Your Background</h3>
                  </div>
                  
                  {/* Input Method Toggle */}
                  <div className="flex space-x-4 mb-6">
                    <Button
                      type="button"
                      variant={inputMethod === 'upload' ? 'default' : 'outline'}
                      onClick={() => setInputMethod('upload')}
                      disabled={uiState === 'generating'}
                      className="flex items-center space-x-2"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload Resume</span>
                    </Button>
                    <Button
                      type="button"
                      variant={inputMethod === 'manual' ? 'default' : 'outline'}
                      onClick={() => setInputMethod('manual')}
                      disabled={uiState === 'generating'}
                      className="flex items-center space-x-2"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Paste Text</span>
                    </Button>
                  </div>

                  {/* Option A - Upload Resume */}
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
                            disabled={uiState === 'generating' || isUploading}
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

                      {/* Uploaded File Preview */}
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
                              disabled={uiState === 'generating'}
                            />
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Option B - Manual Text Entry */}
                  {inputMethod === 'manual' && (
                    <div className="space-y-2">
                      <Label htmlFor="experience">Or paste your experience manually</Label>
                      <Textarea 
                        id="experience"
                        name="experience"
                        placeholder="Paste your current resume or background experience here..."
                        className="min-h-[400px] bg-background"
                        disabled={uiState === 'generating'}
                        required
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Generate Button */}
              <div className="text-center space-y-4 mb-8">
                <Button 
                  type="submit"
                  size="lg" 
                  className="px-12 py-3 text-lg"
                  disabled={uiState === 'generating'}
                >
                  {uiState === 'generating' ? 'Generating...' : 'Generate Documents'}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Your resume and cover letter will be tailored to this specific role
                </p>
              </div>
            </form>

            {/* Live Preview Panels */}
            {(uiState === 'generating' || uiState === 'done') && (resumeContent || coverLetterContent) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                {/* Resume Preview */}
                {resumeContent && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Resume Preview</h3>
                    <div className="bg-muted p-6 rounded-lg border max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{resumeContent}</pre>
                    </div>
                  </div>
                )}

                {/* Cover Letter Preview */}
                {coverLetterContent && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-foreground">Cover Letter Preview</h3>
                    <div className="bg-muted p-6 rounded-lg border max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">{coverLetterContent}</pre>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Buttons */}
            {uiState === 'done' && (
              <div className="text-center space-y-4 mb-8">
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button 
                    size="lg"
                    onClick={() => handleDownload('resume')}
                    className="px-8"
                  >
                    Download Resume PDF
                  </Button>
                  <Button 
                    size="lg"
                    onClick={() => handleDownload('cover-letter')}
                    className="px-8"
                  >
                    Download Cover Letter PDF
                  </Button>
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

            {/* Fit Analysis Panel */}
            {fitAnalysis && uiState === 'done' && (
              <div className="max-w-4xl mx-auto mb-8">
                <div className="bg-card border border-border rounded-lg p-6 shadow-sm">
                  <div className={`flex items-center justify-between mb-6 p-4 rounded-lg ${
                    fitAnalysis.overallFit === 'Strong Fit' 
                      ? 'bg-green-50 border-green-200' 
                      : fitAnalysis.overallFit === 'Good Fit'
                      ? 'bg-yellow-50 border-yellow-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <h3 className="text-xl font-semibold text-foreground">Fit Analysis</h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      fitAnalysis.overallFit === 'Strong Fit'
                        ? 'bg-green-100 text-green-800'
                        : fitAnalysis.overallFit === 'Good Fit' 
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-orange-100 text-orange-800'
                    }`}>
                      {fitAnalysis.overallFit}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Strengths */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-medium text-green-800 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Where you're strong
                      </h4>
                      <ul className="space-y-2">
                        {fitAnalysis.strengths.map((strength, index) => (
                          <li key={index} className="text-sm text-foreground bg-green-50 p-3 rounded border-l-4 border-green-400">
                            {strength}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Gaps */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-medium text-amber-800 flex items-center">
                        <span className="w-2 h-2 bg-amber-500 rounded-full mr-2"></span>
                        Gaps to be aware of
                      </h4>
                      <ul className="space-y-2">
                        {fitAnalysis.gaps.map((gap, index) => (
                          <li key={index} className="text-sm text-foreground bg-amber-50 p-3 rounded border-l-4 border-amber-400">
                            {gap}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggestions */}
                    <div className="space-y-3">
                      <h4 className="text-lg font-medium text-blue-800 flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                        Specific suggestions
                      </h4>
                      <ul className="space-y-2">
                        {fitAnalysis.suggestions.map((suggestion, index) => (
                          <li key={index} className="text-sm text-foreground bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
