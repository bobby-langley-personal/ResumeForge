export const metadata = {
  title: 'Privacy Policy — Easy Apply AI',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: April 13, 2025</p>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Overview</h2>
          <p className="text-muted-foreground leading-relaxed">
            Easy Apply AI (&ldquo;we&rdquo;, &ldquo;our&rdquo;, or &ldquo;us&rdquo;) operates the Easy Apply AI web application at{' '}
            <a href="https://www.easy-apply.ai" className="text-blue-500 hover:text-blue-400">
              easy-apply.ai
            </a>{' '}
            and the accompanying Chrome browser extension. This policy explains what information we collect, how we use it, and your rights.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Information We Collect</h2>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc list-inside">
            <li>
              <span className="text-foreground font-medium">Account information</span> — your email address and name, provided when you sign up via email or a social provider (Google, etc.).
            </li>
            <li>
              <span className="text-foreground font-medium">Resume and experience content</span> — documents you upload or paste into the app for use in resume tailoring.
            </li>
            <li>
              <span className="text-foreground font-medium">Job posting content</span> — job descriptions you paste or import via URL for tailoring purposes.
            </li>
            <li>
              <span className="text-foreground font-medium">Generated documents</span> — resumes and cover letters produced by the AI, stored so you can access them later.
            </li>
            <li>
              <span className="text-foreground font-medium">Billing information</span> — payment details are handled entirely by Stripe and are never stored on our servers.
            </li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Chrome Extension — Permissions</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            The Easy Apply Chrome extension requests the following browser permissions:
          </p>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc list-inside">
            <li>
              <span className="text-foreground font-medium">Tabs</span> — used to detect whether an easy-apply.ai tab is open so API requests can be routed through the page&rsquo;s own origin, satisfying authentication requirements. Tab URLs from other sites are read only to filter for easy-apply.ai tabs and are never stored or transmitted.
            </li>
            <li>
              <span className="text-foreground font-medium">Cookies</span> — used as a fallback to read the session token from easy-apply.ai cookies when no app tab is open, so you stay authenticated while using the extension on job boards.
            </li>
            <li>
              <span className="text-foreground font-medium">Scripting</span> — used to extract job posting text from the page you are currently viewing, and to execute authenticated API calls inside an easy-apply.ai tab context.
            </li>
            <li>
              <span className="text-foreground font-medium">Storage</span> — used to persist your preferences (such as selected resume) locally in the browser.
            </li>
            <li>
              <span className="text-foreground font-medium">Side Panel</span> — used to display the extension UI in Chrome&rsquo;s built-in side panel.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            The extension does <span className="text-foreground font-medium">not</span> collect browsing history, inject ads, track you across sites, or transmit any data unrelated to the resume tailoring workflow.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">How We Use Your Information</h2>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc list-inside">
            <li>To generate tailored resumes and cover letters using AI (Anthropic Claude).</li>
            <li>To store your generated documents so you can download or revisit them.</li>
            <li>To manage your account, subscription, and billing.</li>
            <li>To improve the product and fix bugs (aggregated, non-identifiable usage patterns).</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Third-Party Services</h2>
          <ul className="space-y-3 text-muted-foreground leading-relaxed list-disc list-inside">
            <li>
              <span className="text-foreground font-medium">Anthropic</span> — your resume and job description content is sent to Anthropic&rsquo;s Claude API to generate documents. Anthropic&rsquo;s{' '}
              <a href="https://www.anthropic.com/privacy" className="text-blue-500 hover:text-blue-400" target="_blank" rel="noopener noreferrer">privacy policy</a> applies.
            </li>
            <li>
              <span className="text-foreground font-medium">Clerk</span> — handles authentication. See{' '}
              <a href="https://clerk.com/privacy" className="text-blue-500 hover:text-blue-400" target="_blank" rel="noopener noreferrer">Clerk&rsquo;s privacy policy</a>.
            </li>
            <li>
              <span className="text-foreground font-medium">Stripe</span> — handles payment processing. See{' '}
              <a href="https://stripe.com/privacy" className="text-blue-500 hover:text-blue-400" target="_blank" rel="noopener noreferrer">Stripe&rsquo;s privacy policy</a>.
            </li>
            <li>
              <span className="text-foreground font-medium">Supabase</span> — stores your account data and generated documents in a secured database.
            </li>
          </ul>
          <p className="text-muted-foreground leading-relaxed mt-4">
            We do not sell, rent, or share your personal data with any third party for advertising or marketing purposes.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Data Retention</h2>
          <p className="text-muted-foreground leading-relaxed">
            Your account data and generated documents are retained as long as your account is active. You may delete individual documents at any time from the AI Resumes dashboard. To request full account deletion, contact us at the email below.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
          <p className="text-muted-foreground leading-relaxed">
            You may request access to, correction of, or deletion of your personal data at any time by contacting us. We will respond within 30 days.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-3">Changes to This Policy</h2>
          <p className="text-muted-foreground leading-relaxed">
            We may update this policy from time to time. The &ldquo;Last updated&rdquo; date at the top of this page will reflect any changes. Continued use of the service after changes constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about this policy? Email us at{' '}
            <a href="mailto:bobby@bobbylangley.com" className="text-blue-500 hover:text-blue-400">
              bobby@bobbylangley.com
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}
