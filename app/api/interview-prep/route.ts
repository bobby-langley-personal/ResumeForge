import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';
import { logUserEvent } from '@/lib/log-user-event';
import { InterviewPrep, InterviewPrepRequest } from '@/types/interview-prep';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an expert interview coach. Given a job description and a candidate's resume, generate exactly 8 interview questions that are highly tailored to this specific role and company.

Generate questions across these 6 categories (total must equal 8):
- technical: 2 questions (role-specific skills, tools, or domain knowledge)
- behavioral: 2 questions (past situations using STAR method)
- motivation: 1 question (why this role/company)
- background: 1 question (career path or specific experience)
- situational: 1 question (hypothetical scenario relevant to the role)
- curveball: 1 question (unexpected but insightful)

For each question, provide:
- hint: array of 2-3 concrete talking points the candidate should hit, grounded in their actual resume content
- resumeReference: a direct quote or specific detail from the resume that is most relevant to this question

Output ONLY valid JSON in this exact format, no markdown fences, no preamble:
{
  "questions": [
    {
      "category": "technical",
      "question": "...",
      "hint": ["...", "..."],
      "resumeReference": "..."
    }
  ]
}`;

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: InterviewPrepRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { applicationId, jobTitle, company, jobDescription, generatedResume, toughQuestions } = body;
  if (!applicationId || !jobTitle || !company || !jobDescription || !generatedResume) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const supabase = supabaseServer();

  // Verify ownership and fetch prep/user data in parallel
  const [{ data: app, error: fetchError }, { data: userData }] = await Promise.all([
    supabase
      .from('applications')
      .select('id, user_id, interview_prep')
      .eq('id', applicationId)
      .single(),
    supabase
      .from('users')
      .select('subscription_status, interview_prep_count')
      .eq('id', userId)
      .single(),
  ]);

  if (fetchError || !app) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (app.user_id !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const isPro = userData?.subscription_status === 'pro';
  const prepCount = userData?.interview_prep_count ?? 0;
  const isFirstTimeGen = !app.interview_prep; // regen doesn't count against the limit

  if (!isPro && isFirstTimeGen && prepCount >= 2) {
    logUserEvent(userId, 'interview_prep_locked_click', { applicationId, prepCount });
    return NextResponse.json(
      { error: 'PREP_LIMIT_REACHED', upgradeUrl: '/pricing' },
      { status: 402 }
    );
  }

  const userContent = `JOB TITLE: ${jobTitle}
COMPANY: ${company}

JOB DESCRIPTION:
${jobDescription}

CANDIDATE RESUME:
${generatedResume}${toughQuestions?.length ? `\n\nTOUGH APPLICATION QUESTIONS TO REFERENCE:\n${toughQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')}` : ''}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { HAIKU } = await getModels();

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 2000,
      temperature: 0.4,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const rawText = response.content[0].type === 'text' ? response.content[0].text : '';
    // Haiku wraps JSON in markdown fences despite instructions — strip fences and extract object
    const stripped = rawText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    const jsonText = stripped.match(/\{[\s\S]*\}/)?.[0] ?? stripped;

    let prep: InterviewPrep;
    try {
      prep = JSON.parse(jsonText);
    } catch {
      console.error('[interview-prep] Failed to parse Haiku response:', rawText.slice(0, 200));
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    // Save to Supabase
    const { error: updateError } = await supabase
      .from('applications')
      .update({ interview_prep: prep })
      .eq('id', applicationId)
      .eq('user_id', userId);

    if (updateError) console.error('[interview-prep] Save error:', updateError.message);

    // Increment interview_prep_count on first-time generation for free users
    if (!isPro && isFirstTimeGen) {
      void supabase
        .from('users')
        .update({ interview_prep_count: prepCount + 1 })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.error('[interview-prep] Count increment error:', error.message);
          else console.log('[interview-prep] interview_prep_count incremented to', prepCount + 1);
        });
    }

    return NextResponse.json(prep);
  } catch (err) {
    console.error('[interview-prep] Error:', err);
    return NextResponse.json({ error: 'Generation failed' }, { status: 500 });
  }
}
