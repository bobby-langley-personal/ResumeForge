#!/usr/bin/env npx tsx
/**
 * Seed script for the staging Supabase database.
 *
 * Usage:
 *   STAGING_SERVICE_KEY=<service_role_key> npx tsx scripts/seed-staging.ts
 *
 * Get the service role key from:
 *   https://supabase.com/dashboard/project/hksvhbgufygyndgnlfqq/settings/api
 *
 * What this creates:
 *   - 2 synthetic users (one free, one pro)
 *   - 3 resume documents
 *   - 5 applications with varied statuses (applied, interviewing, offered, rejected)
 *   - 2 user profiles
 *
 * Note: These users have synthetic IDs (seed_user_*) — they are NOT Clerk users.
 * They won't be accessible via the app UI (auth will reject them). They exist
 * for testing admin views and raw DB queries. For full end-to-end testing,
 * sign up via the staging URL with real credentials.
 */

import { createClient } from '@supabase/supabase-js'

const STAGING_URL = 'https://hksvhbgufygyndgnlfqq.supabase.co'
const SERVICE_KEY = process.env.STAGING_SERVICE_KEY

if (!SERVICE_KEY) {
  console.error('❌ STAGING_SERVICE_KEY env var is required.')
  console.error('   Get it from: https://supabase.com/dashboard/project/hksvhbgufygyndgnlfqq/settings/api')
  process.exit(1)
}

const supabase = createClient(STAGING_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function seed() {
  console.log('🌱 Seeding staging database...\n')

  // ── Users ──────────────────────────────────────────────────────────────────
  const users = [
    {
      id: 'seed_user_free_001',
      email: 'free-user@seed.example.com',
      full_name: 'Alex Free',
      subscription_status: 'free',
      tailored_resume_count: 2,
      weekly_resume_count: 2,
      weekly_window_start: new Date().toISOString(),
    },
    {
      id: 'seed_user_pro_001',
      email: 'pro-user@seed.example.com',
      full_name: 'Sam Pro',
      subscription_status: 'pro',
      subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      tailored_resume_count: 18,
      weekly_resume_count: 3,
      weekly_window_start: new Date().toISOString(),
      chat_unlocked_count: 3,
    },
  ]

  for (const user of users) {
    const { error } = await supabase.from('users').upsert(user, { onConflict: 'id' })
    if (error) console.error(`  ❌ User ${user.id}: ${error.message}`)
    else console.log(`  ✅ User: ${user.email} (${user.subscription_status})`)
  }

  // ── User profiles ──────────────────────────────────────────────────────────
  const profiles = [
    {
      user_id: 'seed_user_pro_001',
      full_name: 'Sam Pro',
      email: 'pro-user@seed.example.com',
      location: 'San Francisco, CA',
      linkedin_url: 'https://linkedin.com/in/sampro',
    },
    {
      user_id: 'seed_user_free_001',
      full_name: 'Alex Free',
      email: 'free-user@seed.example.com',
      location: 'Austin, TX',
      linkedin_url: '',
    },
  ]

  for (const profile of profiles) {
    const { error } = await supabase.from('user_profiles').upsert(profile, { onConflict: 'user_id' })
    if (error) console.error(`  ❌ Profile ${profile.user_id}: ${error.message}`)
    else console.log(`  ✅ Profile: ${profile.full_name}`)
  }

  // ── Resumes ────────────────────────────────────────────────────────────────
  const { data: resumeRows, error: resumeErr } = await supabase
    .from('resumes')
    .insert([
      {
        user_id: 'seed_user_pro_001',
        title: 'Software Engineer — Main Resume',
        content: {
          text: 'Experienced software engineer with 6 years in React, TypeScript, and Node.js. Led teams of 3–5 engineers at two Series A startups. Built and shipped features used by 100K+ users. Strong background in performance optimisation and design system architecture.',
        },
        item_type: 'resume',
        is_default: true,
      },
      {
        user_id: 'seed_user_pro_001',
        title: 'Side Projects & Open Source',
        content: {
          text: 'Built and shipped 3 indie SaaS products (500–2K users each). Contributor to open-source projects with 500+ GitHub stars. Proficient in Next.js, Supabase, Stripe integration, and Vercel deployment.',
        },
        item_type: 'resume',
        is_default: false,
      },
      {
        user_id: 'seed_user_free_001',
        title: 'Digital Marketing Resume',
        content: {
          text: 'Digital marketing specialist with 4 years of experience in SEO, content strategy, and paid acquisition. Managed $500K+ annual ad budgets across Google and Meta. Grew organic traffic 3x at previous role through content-led SEO strategy.',
        },
        item_type: 'resume',
        is_default: true,
      },
    ])
    .select()

  if (resumeErr) console.error(`  ❌ Resumes: ${resumeErr.message}`)
  else console.log(`  ✅ ${resumeRows!.length} resumes`)

  // ── Applications ───────────────────────────────────────────────────────────
  const now = new Date()
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()

  const { data: appRows, error: appErr } = await supabase
    .from('applications')
    .insert([
      {
        user_id: 'seed_user_pro_001',
        company: 'Acme Corp',
        job_title: 'Senior Software Engineer',
        job_description: 'We are looking for a senior engineer to lead our frontend platform team. Required: 5+ years React, TypeScript, experience with design systems. Nice to have: GraphQL, Storybook.',
        status: 'interviewing',
        resume_content: '[Seed] Tailored resume for Acme Corp senior engineer role.',
        fit_analysis: {
          overallFit: 'Strong Fit',
          strengths: ['React experience exceeds requirement', 'Design system background', 'Team lead history'],
          gaps: [],
          suggestions: ['Mention Storybook if used'],
        },
        chat_enabled: true,
        created_at: daysAgo(5),
      },
      {
        user_id: 'seed_user_pro_001',
        company: 'Buildco',
        job_title: 'Staff Engineer',
        job_description: 'Staff engineer on our infrastructure team. Required: distributed systems, Kubernetes, Go or Rust. Preferred: experience scaling to 10M+ users.',
        status: 'applied',
        resume_content: '[Seed] Tailored resume for Buildco staff engineer role.',
        fit_analysis: {
          overallFit: 'Stretch Role',
          strengths: ['Engineering leadership', 'Scaling experience'],
          gaps: ['Kubernetes not evidenced', 'Go/Rust not in background'],
          suggestions: ['Focus on distributed system design work'],
        },
        chat_enabled: true,
        created_at: daysAgo(3),
      },
      {
        user_id: 'seed_user_pro_001',
        company: 'StartupXYZ',
        job_title: 'Engineering Lead',
        job_description: 'First engineering hire at an early-stage B2B SaaS startup. Must be comfortable wearing many hats — product, architecture, and hiring.',
        status: 'offered',
        resume_content: '[Seed] Tailored resume for StartupXYZ engineering lead.',
        fit_analysis: {
          overallFit: 'Strong Fit',
          strengths: ['Startup experience', 'Full-stack skills', 'SaaS product background'],
          gaps: [],
          suggestions: [],
        },
        chat_enabled: true,
        created_at: daysAgo(14),
      },
      {
        user_id: 'seed_user_pro_001',
        company: 'BigTech Inc',
        job_title: 'Software Engineer III',
        job_description: 'Software engineer on our ads platform. Required: Java, distributed systems at petabyte scale. PhD or equivalent research background preferred.',
        status: 'rejected',
        resume_content: '[Seed] Tailored resume for BigTech SWE III.',
        fit_analysis: {
          overallFit: 'Stretch Role',
          strengths: ['Strong engineering fundamentals'],
          gaps: ['Java not in background', 'Ads/bidding systems not evidenced'],
          suggestions: [],
        },
        chat_enabled: false,
        created_at: daysAgo(20),
      },
      {
        user_id: 'seed_user_free_001',
        company: 'Agency Co',
        job_title: 'Digital Marketing Manager',
        job_description: 'Marketing manager to own our digital acquisition channels. Required: Google Ads, Meta, SEO. Nice to have: HubSpot, Salesforce.',
        status: 'applied',
        resume_content: '[Seed] Tailored resume for Agency Co marketing manager.',
        fit_analysis: {
          overallFit: 'Good Fit',
          strengths: ['SEO expertise', 'Paid media management', 'Budget management experience'],
          gaps: ['HubSpot not mentioned'],
          suggestions: ['Add HubSpot if used'],
        },
        chat_enabled: true,
        created_at: daysAgo(2),
      },
    ])
    .select()

  if (appErr) console.error(`  ❌ Applications: ${appErr.message}`)
  else console.log(`  ✅ ${appRows!.length} applications (applied, interviewing, offered, rejected)`)

  console.log('\n✅ Staging seed complete.')
  console.log('\nSeed users:')
  console.log('  free-user@seed.example.com  — free tier, 2 resumes used this week')
  console.log('  pro-user@seed.example.com   — pro, 4 applications across all statuses')
  console.log('\nThese are synthetic (non-Clerk) users. For auth testing, sign up at your staging URL.')
}

seed().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
