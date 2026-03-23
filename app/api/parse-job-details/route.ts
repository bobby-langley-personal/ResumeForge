import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { jobDescription } = await req.json();
    if (!jobDescription?.trim()) {
      return new Response('Missing jobDescription', { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { HAIKU } = await getModels();

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 100,
      system: `Extract the company name and job title from the job description text.
Output valid JSON only — no markdown fences, no explanation, nothing else:
{"company": "...", "jobTitle": "..."}

Rules:
- jobTitle is the specific position being hired for (e.g. "Customer Success Engineer", "Senior Software Engineer"). If the text uses a team/department name like "Customer Success Engineering" as a section header but the actual role is clearly an engineer/manager/etc, infer the correct singular title.
- company is the name of the hiring company (e.g. "Hightouch", "ISE"). Ignore job board names.
- Both fields are required. Make your best guess — do not return null.`,
      messages: [
        {
          role: 'user',
          content: jobDescription.slice(0, 4000),
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    console.log('[parse-job-details] Raw model response:', text);

    let parsed: { company?: unknown; jobTitle?: unknown } = {};
    try {
      // Strip markdown fences if model ignores instructions
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.warn('[parse-job-details] JSON parse failed, raw text:', text);
    }

    return Response.json({
      company: typeof parsed.company === 'string' ? parsed.company : null,
      jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[parse-job-details] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
