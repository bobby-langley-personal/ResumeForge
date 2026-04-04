import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { supabaseServer } from '@/lib/supabase';
import HomeRouter from '@/components/HomeRouter';
import { ArrowRight, FileText, Sparkles, Target, X, Check, Globe, MousePointerClick, Zap, ShieldCheck } from 'lucide-react';

export default async function HomePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen flex flex-col">
        {/* Marketing Navbar */}
        <nav className="bg-slate-900 text-white sticky top-0 z-50 shadow-lg">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-blue-400 flex-shrink-0" />
              <span className="text-lg font-bold tracking-tight whitespace-nowrap">Easy Apply</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              <Link
                href="/sign-in"
                className="text-sm font-medium text-white/80 hover:text-white transition-colors px-2 sm:px-3 py-1.5 whitespace-nowrap"
              >
                Sign In
              </Link>
              <Link
                href="/sign-up"
                className="text-sm font-semibold bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
              >
                <span className="hidden sm:inline">Get Started Free</span>
                <span className="sm:hidden">Sign Up</span>
              </Link>
            </div>
          </div>
        </nav>

        {/* Hero */}
        <section className="bg-slate-900 text-white py-16 sm:py-24 lg:py-28 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-blue-500/30">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
              Powered by Claude AI
            </div>
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
              Land more interviews.{' '}
              <span className="text-blue-400">Faster.</span>
            </h1>
            <p className="text-base sm:text-xl text-white/70 max-w-2xl mx-auto mb-10">
              Easy Apply tailors your resume and cover letter to every job posting in seconds —
              so you spend less time formatting and more time actually applying.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/sign-up"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-blue-700 transition-colors text-base shadow-lg shadow-blue-600/30"
              >
                Get Started Free
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/sign-in"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 border border-white/20 text-white/80 font-semibold px-6 py-3 rounded-xl hover:bg-white/10 transition-colors text-base"
              >
                Sign In
              </Link>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-slate-50 py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Everything you need to apply smarter
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
                Stop sending the same resume everywhere. Easy Apply builds a tailored application for every role.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                {
                  icon: FileText,
                  title: 'AI-Tailored Resumes',
                  description:
                    'Paste a job description and your background — get a polished, keyword-matched resume in under 60 seconds.',
                  color: 'text-blue-600',
                  bg: 'bg-blue-50',
                },
                {
                  icon: Sparkles,
                  title: 'Cover Letter Generator',
                  description:
                    'Auto-generate a compelling cover letter alongside your resume. Personalized, not generic.',
                  color: 'text-violet-600',
                  bg: 'bg-violet-50',
                },
                {
                  icon: Target,
                  title: 'Fit Analysis',
                  description:
                    'See your strengths, gaps, and planned improvements before you apply — so you know exactly where you stand.',
                  color: 'text-emerald-600',
                  bg: 'bg-emerald-50',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className={`w-12 h-12 ${feature.bg} rounded-xl flex items-center justify-center mb-4`}>
                    <feature.icon className={`w-6 h-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Template Myth Section */}
        <section className="bg-white py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">A different approach</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                Your template doesn&apos;t get you the job.{' '}
                <span className="text-blue-600">Your content does.</span>
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
                Over 99% of large employers run every resume through automated screening software before a human ever reads it.
                That software doesn&apos;t care if your resume has two columns or a sidebar — it parses plain text and scores keyword relevance.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
              {/* Old way */}
              <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-5">The old way</p>
                <ul className="space-y-3">
                  {[
                    'Pick from 15 resume templates',
                    'Agonize over fonts and column layouts',
                    'Send the same resume to every job',
                    'Wonder why the callbacks never come',
                    'Pay for a "premium" template that ATS ignores',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-500">
                      <X className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Easy Apply way */}
              <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6">
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-5">The Easy Apply way</p>
                <ul className="space-y-3">
                  {[
                    'One experience library, infinite tailored resumes',
                    'AI matches your keywords to each job description',
                    'Content-first — structure that both ATS and humans read',
                    'Fit analysis shows your gaps before you apply',
                    'Template-agnostic output that works everywhere',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm text-slate-700">
                      <Check className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <p className="text-center text-xs text-slate-400 mt-6 max-w-xl mx-auto">
              ATS screening statistics sourced from Jobscan research. &ldquo;Template-agnostic&rdquo; means Easy Apply focuses entirely on
              getting the right content in front of the right system — not selling you a layout.
            </p>
          </div>
        </section>

        {/* How it works */}
        <section className="bg-slate-50 py-16 sm:py-20 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">How it works</h2>
              <p className="text-slate-500 text-sm sm:text-base">From resume to application-ready in three steps.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {[
                {
                  step: '1',
                  icon: FileText,
                  title: 'Upload Your Resume',
                  description:
                    'Add your existing resume or work history to build your Experience Library.',
                },
                {
                  step: '2',
                  icon: Target,
                  title: 'Paste the Job',
                  description:
                    'Drop in a job URL or paste the description. Easy Apply extracts everything it needs.',
                },
                {
                  step: '3',
                  icon: Sparkles,
                  title: 'Generate & Apply',
                  description:
                    'Get a tailored resume and cover letter. Download as PDF and hit send.',
                },
              ].map((item) => (
                <div key={item.step} className="flex flex-col items-center text-center">
                  <div className="relative mb-5">
                    <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg">
                      <item.icon className="w-7 h-7 text-blue-400" />
                    </div>
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-blue-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Chrome Extension Section */}
        <section className="bg-slate-900 text-white py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 border border-blue-500/30">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                Chrome Extension
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                One click from any job board.
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
                Once you&apos;re set up, the daily workflow takes under a minute. Browse LinkedIn, Indeed,
                or anywhere else — the extension brings your experience library with it.
              </p>
            </div>

            {/* Step flow */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto mb-12">
              {[
                {
                  icon: Globe,
                  step: '01',
                  title: 'Browse any job board',
                  description: 'LinkedIn, Indeed, Glassdoor, company sites — the extension works wherever job postings live.',
                  color: 'text-blue-400',
                  bg: 'bg-blue-600/10 border-blue-500/20',
                },
                {
                  icon: MousePointerClick,
                  step: '02',
                  title: 'Click the extension',
                  description: 'It reads the job title, company, and description automatically. No copy-pasting required.',
                  color: 'text-violet-400',
                  bg: 'bg-violet-600/10 border-violet-500/20',
                },
                {
                  icon: Zap,
                  step: '03',
                  title: 'Tailored resume, instantly',
                  description: 'Your library generates a role-specific resume and cover letter. Review, download, apply.',
                  color: 'text-emerald-400',
                  bg: 'bg-emerald-600/10 border-emerald-500/20',
                },
              ].map((item, i) => (
                <div key={item.step} className="relative">
                  {/* Connector line between cards on desktop */}
                  {i < 2 && (
                    <div className="hidden sm:block absolute top-8 -right-2 w-4 h-px bg-white/10 z-10" />
                  )}
                  <div className={`rounded-2xl border p-5 ${item.bg}`}>
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center flex-shrink-0">
                        <item.icon className={`w-4 h-4 ${item.color}`} />
                      </div>
                      <span className="text-xs font-bold text-white/30 tracking-widest">{item.step}</span>
                    </div>
                    <h3 className="text-sm font-semibold text-white mb-1.5">{item.title}</h3>
                    <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Trust / control callouts */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto border-t border-white/10 pt-10">
              {[
                {
                  icon: ShieldCheck,
                  title: 'You stay in control',
                  description: 'Review every resume before downloading. Change anything you want — the AI is a starting point, not the final word.',
                },
                {
                  icon: FileText,
                  title: 'Your words, AI-shaped',
                  description: 'Easy Apply only uses your actual background. Nothing is invented or padded — it surfaces what\'s already there and frames it for the role.',
                },
                {
                  icon: Target,
                  title: 'Better than a template site',
                  description: 'Template tools give everyone the same structure. Easy Apply gives you a resume that\'s specifically written for the job you\'re actually applying to.',
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <item.icon className="w-4 h-4 text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white mb-1">{item.title}</p>
                    <p className="text-xs text-white/50 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Strip */}
        <section className="bg-blue-600 py-14 sm:py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
              Ready to apply smarter?
            </h2>
            <p className="text-white/80 mb-8 text-base sm:text-lg">
              Join job seekers who use Easy Apply to tailor every application and land more interviews.
            </p>
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-7 sm:px-8 py-3.5 rounded-xl hover:bg-blue-50 transition-colors text-base shadow-lg"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white/60 py-8 px-4">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="font-semibold text-white">Easy Apply</span>
            </div>
            <p className="text-sm text-center sm:text-right">
              &copy; {new Date().getFullYear()} Easy Apply. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    );
  }

  const user = await currentUser();
  const firstName = user?.firstName ?? user?.fullName?.split(' ')[0] ?? null;

  const supabase = supabaseServer();
  const [docsResult, appsResult] = await Promise.all([
    supabase
      .from('resumes')
      .select('id')
      .eq('user_id', userId),
    supabase
      .from('applications')
      .select('id')
      .eq('user_id', userId)
      .limit(1),
  ]);

  const documents = docsResult.data ?? [];
  const hasDocuments = documents.length > 0;
  const hasApplications = (appsResult.data?.length ?? 0) > 0;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <HomeRouter
          firstName={firstName}
          hasDocuments={hasDocuments}
          hasApplications={hasApplications}
        />
      </main>
    </div>
  );
}
