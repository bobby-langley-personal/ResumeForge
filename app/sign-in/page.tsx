import { SignIn } from '@clerk/nextjs';

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* ResumeForge Wordmark */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground text-center">ResumeForge</h1>
      </div>
      
      <SignIn 
        appearance={{
          elements: {
            formButtonPrimary: "bg-primary hover:bg-primary/90 text-primary-foreground",
            card: "bg-card border-border shadow-lg",
            headerTitle: "text-card-foreground",
            headerSubtitle: "text-muted-foreground",
            socialButtonsBlockButton: "bg-secondary hover:bg-secondary/80 border-border text-secondary-foreground",
            formFieldLabel: "text-card-foreground",
            formFieldInput: "bg-background border-border text-foreground",
            footerActionLink: "text-primary hover:text-primary/80",
            identityPreviewText: "text-muted-foreground",
            formResendCodeLink: "text-primary hover:text-primary/80",
            otpCodeFieldInput: "border-border",
            alternativeMethodsBlockButton: "text-muted-foreground hover:text-foreground"
          },
          layout: {
            logoPlacement: 'none'
          }
        }}
        signUpUrl="/sign-up"
      />
    </div>
  );
}