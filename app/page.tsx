import { auth, currentUser } from '@clerk/nextjs/server';
import Link from 'next/link';
import { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import { supabaseServer } from '@/lib/supabase';
import HomeRouter from '@/components/HomeRouter';
import AnimatedCounter from '@/components/AnimatedCounter';
import { ArrowRight, FileText, Sparkles, Target, X, Check, Globe, MousePointerClick, Zap, ShieldCheck, MessageSquareText, Library, Star, Clock } from 'lucide-react';

/** Fetches total resume count from DB — used inside a Suspense boundary */
async function ResumesGeneratedBadge() {
  const supabase = supabaseServer();
  const { count } = await supabase
    .from('applications')
    .select('*', { count: 'exact', head: true });
  const total = count ?? 0;
  return (
    <div className="inline-flex items-center gap-2 text-white/50 text-sm">
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
      <span className="font-semibold text-white tabular-nums">
        <AnimatedCounter target={total} />
      </span>
      <span>resumes generated and counting</span>
    </div>
  );
}

/** Renders the brand name with a small "AI" superscript badge */
function Brand({ className }: { className?: string }) {
  return (
    <span className={className}>
      Easy Apply<sup className="text-blue-400 text-[11px] font-bold ml-0.5 align-super">AI</sup>
    </span>
  );
}

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
              <Brand className="text-lg font-bold tracking-tight whitespace-nowrap" />
            </div>
            <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
              {/* Extension badge — hidden on very small screens */}
              <a
                href="#extension"
                className="hidden sm:inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium px-2.5 py-1 rounded-full hover:bg-amber-500/25 transition-colors whitespace-nowrap"
              >
                <span>🔌</span>
                <span>Chrome Extension OTW</span>
              </a>
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

            {/* Live resume count */}
            <div className="mt-8 flex justify-center">
              <Suspense
                fallback={
                  <div className="inline-flex items-center gap-2 text-white/30 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/20 flex-shrink-0" />
                    <span className="w-48 h-4 bg-white/10 rounded animate-pulse" />
                  </div>
                }
              >
                <ResumesGeneratedBadge />
              </Suspense>
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
                Stop sending the same resume everywhere. <Brand /> builds a tailored application for every role.
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
                That software doesn&apos;t care if your resume has two columns or a sidebar — it parses plain text and scores keyword relevance.{' '}
                <Brand /> focuses entirely on getting the right content in front of the right system.
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
                <p className="text-sm font-semibold text-blue-600 uppercase tracking-widest mb-5">The <Brand /> way</p>
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

        {/* Experience / Interview Section */}
        <section className="bg-white py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Your experience library</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-4">
                A real resume, built from your{' '}
                <span className="text-blue-600">actual background.</span>
              </h2>
              <p className="text-slate-500 max-w-2xl mx-auto text-sm sm:text-base">
                Most people struggle to put their own experience into words — that&apos;s not a skill problem,
                it&apos;s a framing problem. Easy Apply solves it before you ever paste a job description.
              </p>
            </div>

            {/* Feature grid — 1 large + 2 stacked on desktop */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Large card — AI Interview */}
              <div className="bg-slate-900 text-white rounded-2xl p-7 flex flex-col justify-between">
                <div>
                  <div className="w-11 h-11 bg-blue-600/20 rounded-xl flex items-center justify-center mb-5">
                    <MessageSquareText className="w-5 h-5 text-blue-400" />
                  </div>
                  <h3 className="text-xl font-bold mb-3">AI Experience Interview</h3>
                  <p className="text-white/60 text-sm leading-relaxed mb-5">
                    No resume to start from? No problem. Easy Apply walks you through a conversational interview
                    about your roles, responsibilities, and wins — then builds your experience document from your answers.
                    You talk about what you did; the AI handles the professional phrasing.
                  </p>
                  <ul className="space-y-2">
                    {[
                      'Asks the right follow-up questions to draw out depth',
                      'Turns vague answers into strong, quantified bullets',
                      'Saves to your library — used for every future application',
                    ].map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-white/50">
                        <Check className="w-3.5 h-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <p className="mt-6 text-xs text-white/30 border-t border-white/10 pt-4">
                  Great for first-time resume writers, career changers, and anyone who finds it easier to talk than to type.
                </p>
              </div>

              {/* Right column — 2 smaller cards */}
              <div className="flex flex-col gap-5">
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 flex-1">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                    <Library className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Experience Library</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    Upload your existing resume, add old job descriptions, attach project write-ups — everything lives
                    in one place. Every tailored resume you generate draws from all of it, picking what&apos;s most relevant
                    to the specific role.
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      'Supports PDF, DOCX, and pasted text',
                      'Set a default document for fastest generation',
                      'Add multiple roles, projects, or certifications',
                    ].map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-slate-500">
                        <Check className="w-3.5 h-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-violet-50 border border-violet-100 rounded-2xl p-6 flex-1">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-4 shadow-sm">
                    <Star className="w-5 h-5 text-violet-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">Polished Resume Builder</h3>
                  <p className="text-sm text-slate-500 leading-relaxed mb-4">
                    Already have a rough resume but know it undersells you? Feed it in and let AI expand on it —
                    fleshing out thin bullet points, strengthening language, and structuring it properly — without
                    adding anything that isn&apos;t already true.
                  </p>
                  <ul className="space-y-1.5">
                    {[
                      'Expands weak or vague bullets into strong ones',
                      'Preserves your voice — no generic corporate filler',
                      'Download as a clean, ATS-friendly PDF',
                    ].map((p) => (
                      <li key={p} className="flex items-start gap-2 text-xs text-slate-500">
                        <Check className="w-3.5 h-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Not just for job seekers */}
        <section className="bg-slate-900 text-white py-12 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 bg-white/5 border border-white/10 rounded-2xl p-6 sm:p-8">
              <div className="w-12 h-12 bg-blue-600/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Clock className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-white mb-1">Not looking for a new job? Still worth it.</p>
                <p className="text-sm text-white/55 leading-relaxed max-w-2xl">
                  Most people haven&apos;t updated their CV since their last job hunt — and by then it&apos;s already
                  two years stale. Easy Apply is just as useful for documenting what you&apos;ve accomplished in your
                  current role: new responsibilities, promotions, projects you led. Capture it now, before the details fade.
                  When an opportunity does come along, you&apos;re not starting from scratch.
                </p>
              </div>
            </div>
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

            {/* "Not perfect?" nudge */}
            <div className="mt-12 max-w-2xl mx-auto bg-blue-50 border border-blue-100 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 mb-0.5">Not quite right? Chat with Claude to fix it.</p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  After generating, a built-in AI chat lets you refine any bullet, adjust the tone, trim to one page, or expand a section — all in plain English. Every change updates the PDF preview instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Interview Prep + Q&A strip */}
        <section className="bg-white py-14 sm:py-16 px-4 border-t border-slate-100">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p className="text-xs font-semibold uppercase tracking-widest text-blue-600 mb-3">Beyond the resume</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-3">
                Prep for the interview too.
              </h2>
              <p className="text-slate-500 max-w-xl mx-auto text-sm sm:text-base">
                Your generated resume isn&apos;t the end of the road — <Brand /> keeps helping once you land the interview.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">AI Interview Prep</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">
                  Based on your actual generated resume and the job description, Easy Apply creates 8 tailored interview questions across 6 categories — Technical, Behavioral, Motivation, Situational, Background, and Curveball.
                </p>
                <p className="text-xs text-slate-400">
                  Each question comes with 2–3 answer hints grounded in your resume, so you know exactly what to reference in your response.
                </p>
              </div>
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center mb-4">
                  <MessageSquareText className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Application Question Answers</h3>
                <p className="text-sm text-slate-500 leading-relaxed mb-3">
                  Most applications include open-ended questions — "Tell us about a challenge you overcame", "Why do you want this role?". Paste them in and get AI-written answers grounded entirely in your background.
                </p>
                <p className="text-xs text-slate-400">
                  Answers respect your experience — nothing is made up. Toggle between short (2–3 sentences) and full paragraph responses with one click.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Chrome Extension Section */}
        <section id="extension" className="bg-slate-900 text-white py-16 sm:py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 bg-blue-600/20 text-blue-300 text-xs font-semibold px-3 py-1.5 rounded-full mb-3 border border-blue-500/30">
                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                Chrome Extension
              </div>
              {/* Coming soon banner */}
              <div className="inline-flex items-center gap-2 bg-amber-500/15 text-amber-300 text-xs font-medium px-4 py-2 rounded-full mb-6 border border-amber-500/25">
                <span>🚧</span>
                <span>Coming soon — <span className="italic">blame Google for the review delay</span></span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-4">
                One click from any job board.
              </h2>
              <p className="text-white/60 max-w-2xl mx-auto text-sm sm:text-base">
                Open any job posting in Chrome, click the extension, and it reads the entire tab for you —
                job title, company, description, even application questions — no copy-pasting, no back-and-forth.
                Your experience library is already there. Tailored resume in under a minute.
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
                  description: 'It reads your active tab — job title, company, full description, and application questions. No copy-pasting.',
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
              Join job seekers who use <Brand /> to tailor every application and land more interviews.
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
              <Brand className="font-semibold text-white" />
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
