import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { documentIds } = await req.json() as { documentIds: string[] };
    if (!documentIds?.length) return new Response('documentIds required', { status: 400 });

    const supabase = supabaseServer();
    const { data: docs, error } = await supabase
      .from('resumes')
      .select('title, content, item_type')
      .eq('user_id', userId)
      .in('id', documentIds);

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

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 8000,
      system: `You are an expert resume writer. Based on the candidate's uploaded experience documents, create a comprehensive base resume that captures their full career history.

This is NOT a tailored resume — it should include everything. Hiring managers won't see this directly; it serves as the source of truth for generating tailored versions.

Rules:
- Include ALL roles with full detail — more is better here
- Use the structured format with headers: NAME:, SUMMARY:, EXPERIENCE:, SKILLS:, EDUCATION:
- Write bullets that are specific, metric-driven, and achievement-focused
- Do not filter for any specific role type — include everything
- Err heavily on the side of more detail not less
- Bullet point rules:
  • No repeated action verbs within a role — use a wide variety
  • No hedging qualifiers ("Informally led", "Helped with", "Somewhat", "Assisted in leading")
  • If they led, they led. Reframe confidently: "Helped lead a team" → "Co-led a team of N"
  • Max 180 characters per bullet
  • Action verb + what you did + outcome/impact format
  • Most recent/primary role: 8-10 bullets; supporting roles: 6-8; early career: 4-5

Output the resume text only — no markdown fences, no commentary.`,
      messages: [{
        role: 'user',
        content: `Build a comprehensive base resume from these documents:\n\n${combinedContext}`,
      }],
    });

    const resumeText = response.content[0].type === 'text' ? response.content[0].text : '';
    return Response.json({ resumeText });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[generate-base-resume]', msg);
    return new Response(msg, { status: 500 });
  }
}
