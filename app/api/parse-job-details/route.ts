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
      max_tokens: 1000,
      temperature: 0.2,
      system: `Extract the company name, job title, and application questions from job description text.
Output valid JSON only — no markdown fences, no explanation, nothing else:
{"company": "...", "jobTitle": "...", "questions": ["...", "..."]}

Rules:
- jobTitle: the specific position being hired for (e.g. "Customer Success Engineer"). Infer the correct singular title if a department name is used as a header.
- company: the hiring company name. Ignore job board names.
- company and jobTitle are required — make your best guess, do not return null.
- questions: Extract ONLY explicit open-ended application form questions directed at the applicant — questions the applicant is being asked to answer as part of their application. Strip leading asterisks, numbers, or bullet characters. Include at most 5.

VALID examples:
- "Why do you want to work here?"
- "Describe a time you handled a difficult customer."
- "What experience do you have with warehouse management systems?"

DO NOT extract any of the following — these are not application questions:
- Role requirements phrased as bullets ("Proven track record of renewals", "Background in warehousing")
- Section headings ("What We're Looking For", "About the Role", "What You'll Do")
- Company value statements ("We move fast and support each other")
- Nice-to-have qualifications or preferred experience bullets
- Personal info fields (name, email, phone, address, LinkedIn URL)
- Document uploads (resume, cover letter)
- Yes/No or dropdown fields (work authorization, sponsorship, GPA)
- Demographic/identity fields (race, gender, disability, veteran status)
- Logistical questions (timezone, relocation, salary expectations)

If no valid application questions exist, return {"questions": []}.
When uncertain whether something is a question directed at the applicant, omit it — do not guess.`,
      messages: [
        {
          role: 'user',
          content: jobDescription.slice(0, 6000),
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    console.log('[parse-job-details] Raw model response:', text);

    let parsed: { company?: unknown; jobTitle?: unknown; questions?: unknown } = {};
    try {
      const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      parsed = JSON.parse(clean);
    } catch {
      console.warn('[parse-job-details] JSON parse failed, raw text:', text);
    }

    const questions = Array.isArray(parsed.questions)
      ? (parsed.questions as unknown[]).filter((q): q is string => typeof q === 'string' && q.trim().length > 0).slice(0, 5)
      : [];

    return Response.json({
      company: typeof parsed.company === 'string' ? parsed.company : null,
      jobTitle: typeof parsed.jobTitle === 'string' ? parsed.jobTitle : null,
      questions,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[parse-job-details] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
