import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      {/* Wordmark */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-foreground">
          Easy Apply<sup className="text-blue-500 text-sm font-bold ml-0.5 align-super">AI</sup>
        </h1>
      </div>
      
      <SignUp 
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
            alternativeMethodsBlockButton: "text-muted-foreground hover:text-foreground",
            logoBox: { display: 'none' }
          },
          layout: {
            logoPlacement: 'none'
          }
        }}
        signInUrl="/sign-in"
      />
    </div>
  );
}