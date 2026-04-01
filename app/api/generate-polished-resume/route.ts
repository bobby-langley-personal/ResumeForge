import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { documentIds, pageLimit, roleTypeHint } = await req.json() as {
      documentIds: string[];
      pageLimit: number;
      roleTypeHint?: string;
    };

    if (!documentIds?.length) return new Response('documentIds required', { status: 400 });
    if (!pageLimit || pageLimit < 1 || pageLimit > 4) return new Response('pageLimit must be 1–4', { status: 400 });

    const supabase = supabaseServer();
    const [{ data: docs, error }, { data: profileData }] = await Promise.all([
      supabase
        .from('resumes')
        .select('title, content, item_type')
        .eq('user_id', userId)
        .in('id', documentIds),
      supabase
        .from('user_profiles')
        .select('full_name, email, location, linkedin_url')
        .eq('user_id', userId)
        .single(),
    ]);

    if (error || !docs?.length) return new Response('Documents not found', { status: 404 });

    const combinedContext = docs
      .map(d => {
        const raw = d.content as unknown;
        const text = typeof raw === 'string' ? JSON.parse(raw).text : (raw as { text: string }).text;
        return `=== ${d.title} (${d.item_type}) ===\n${text}`;
      })
      .join('\n\n');

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const { SONNET } = await getModels();

    // Page guidance constants
    const pageGuidance: Record<number, string> = {
      1: '~400–500 words of content, max 2–3 roles, 4–5 bullets per role, compact skills section',
      2: '~800–1000 words, all roles, 6–8 bullets for recent roles, 3–4 for earlier, fuller skills section',
      3: '~1100–1300 words, all roles with full detail, 7–9 bullets for recent roles',
      4: '~1400–1600 words, exhaustive coverage of all roles and achievements',
    };
    const guide = pageGuidance[pageLimit] || pageGuidance[2];

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: pageLimit <= 1 ? 3000 : pageLimit <= 2 ? 5000 : 7000,
      temperature: 0.3,
      system: `You are an expert resume writer creating a polished, standalone resume for general use — not tailored to any specific job description.

This resume should be strong enough to send to a recruiter cold, use at a networking event, or attach to a broad application without modification.

HARD CONSTRAINT: This resume must fit within ${pageLimit} page${pageLimit > 1 ? 's' : ''}. This is non-negotiable.
Page fitting target: ${guide}

Rules:
- Lead with the strongest, most impressive content
- Most recent role gets the most bullets (per page budget); earlier roles get progressively fewer
- Order bullets within each role by impact, not chronology — most impressive first
- Write a strong 2–3 sentence summary that positions the candidate broadly${roleTypeHint ? ` — subtly weight experience relevant to "${roleTypeHint}" roles` : ''}
- Use varied, strong action verbs — no repeats within a role, no hedging qualifiers
- If a bullet runs long, split it; max 180 characters per bullet
- If you need to cut content to hit the page limit, cut the least impactful bullets first
- Consolidate skills into compact categories

Output in EXACTLY this format — no markdown, no fences, no commentary:

NAME: [Full Name]
EMAIL: [email]
PHONE: [phone]
LOCATION: [city, state]
LINKEDIN: [linkedin url if found in documents]

SUMMARY:
[2–3 sentence professional summary]

EXPERIENCE:
[Company Name] | [City, State]
[Job Title] | [Start Month Year] – [End Month Year or Present]
• [bullet]

SKILLS:
[Category]: [skill1], [skill2], [skill3]

EDUCATION:
[Institution] | [City, State]
[Degree]`,
      messages: [{
        role: 'user',
        content: `Build a polished ${pageLimit}-page general-use resume from these documents${roleTypeHint ? ` — the candidate is targeting ${roleTypeHint} roles` : ''}:\n\n${combinedContext}${profileData && (profileData.full_name || profileData.email) ? `\n\n[Use this exact contact information in the resume header — do not change or omit these values:]\nName: ${profileData.full_name || ''}${profileData.email ? `\nEmail: ${profileData.email}` : ''}${profileData.location ? `\nLocation: ${profileData.location}` : ''}${profileData.linkedin_url ? `\nLinkedIn: ${profileData.linkedin_url}` : ''}` : ''}`,
      }],
    });

    const resumeText = (response.content[0].type === 'text' ? response.content[0].text : '').trim().replace(/\n+$/, '');
    return Response.json({ resumeText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-polished-resume]', msg);
    return new Response(msg, { status: 500 });
  }
}
