import { SignedIn, SignedOut, SignInButton, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export default function Home() {
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

            {/* Form */}
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
                    placeholder="Enter company name"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Input 
                    id="jobTitle"
                    placeholder="Enter job title"
                    className="bg-background"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="jobDescription">Job Description</Label>
                  <Textarea 
                    id="jobDescription"
                    placeholder="Paste the full job description here..."
                    className="min-h-[300px] bg-background"
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
                    placeholder="Paste your current resume or background experience here..."
                    className="min-h-[400px] bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Generate Button */}
            <div className="text-center space-y-4">
              <Button 
                size="lg" 
                className="px-12 py-3 text-lg"
                disabled
              >
                Generate Documents
              </Button>
              <p className="text-sm text-muted-foreground">
                Your resume and cover letter will be tailored to this specific role
              </p>
            </div>
          </div>
        </SignedIn>
      </main>
    </div>
  );
}
