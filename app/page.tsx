'use client';

import { useState, useRef } from 'react';
import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { readSSEStream } from '@/lib/sse-reader';

type UIState = 'idle' | 'generating' | 'done' | 'error';

interface FormData {
  company: string;
  jobTitle: string;
  jobDescription: string;
  backgroundExperience: string;
}

export default function Home() {
  const [uiState, setUIState] = useState<UIState>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [resumeContent, setResumeContent] = useState('');
  const [coverLetterContent, setCoverLetterContent] = useState('');
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData(e.target as HTMLFormElement);
    const data: FormData = {
      company: formData.get('company') as string,
      jobTitle: formData.get('jobTitle') as string,
      jobDescription: formData.get('jobDescription') as string,
      backgroundExperience: formData.get('experience') as string,
    };

    // Validate form data
    if (!data.company || !data.jobTitle || !data.jobDescription || !data.backgroundExperience) {
      setErrorMessage('Please fill in all fields');
      setUIState('error');
      return;
    }

    setUIState('generating');
    setStatusMessage('Starting generation...');
    setResumeContent('');
    setCoverLetterContent('');
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
    setErrorMessage('');
    setApplicationId(null);
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
                  
                  <div className="space-y-2">
                    <Label htmlFor="experience">Your Experience</Label>
                    <Textarea 
                      id="experience"
                      name="experience"
                      placeholder="Paste your current resume or background experience here..."
                      className="min-h-[400px] bg-background"
                      disabled={uiState === 'generating'}
                      required
                    />
                  </div>
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
              <div className="text-center space-y-4">
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
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
