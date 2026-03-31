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
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { company, jobTitle, jobDescription, backgroundExperience, questions } = await req.json();

    if (!Array.isArray(questions) || questions.length === 0) {
      return new Response('questions array is required', { status: 400 });
    }

    const filtered = (questions as string[])
      .map((q: string) => q.trim())
      .filter((q) => q.length > 0)
      .slice(0, 5);

    if (filtered.length === 0) {
      return Response.json({ answers: [] });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { SONNET } = await getModels();

    const questionsPrompt = filtered.map((q, i) => `${i + 1}. ${q}`).join('\n');

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 2000,
      temperature: 0.4,
      system: `You are an expert career coach writing job application question answers on behalf of a candidate.

Write authentic, specific answers to each application question.
- Answer in first person as the candidate
- Use concrete examples from their background when relevant
- Keep each answer to 2–3 concise paragraphs
- Match the tone to the role (technical, conversational, formal)
- Do not repeat the question in the answer
- Do not use filler phrases like "Great question" or "I am excited to share"
- Be deterministic: do not vary structure or phrasing between runs on the same input

Return valid JSON only — no markdown, no explanation:
{"answers":[{"question":"...","answer":"..."}]}`,
      messages: [
        {
          role: 'user',
          content: `Company: ${company || 'the company'}\nJob Title: ${jobTitle || 'the role'}\nJob Description: ${(jobDescription || '').slice(0, 4000)}\n\nMy Background:\n${(backgroundExperience || '').slice(0, 4000)}\n\nPlease answer these application questions:\n\n${questionsPrompt}`,
        },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const clean = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
    const match = clean.match(/\{[\s\S]*\}/);

    let answers: { question: string; answer: string }[] = [];
    if (match) {
      try {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.answers)) {
          answers = parsed.answers.filter(
            (a: unknown): a is { question: string; answer: string } =>
              typeof (a as Record<string, unknown>).question === 'string' &&
              typeof (a as Record<string, unknown>).answer === 'string',
          );
        }
      } catch {
        // parse failed, return empty
      }
    }

    return Response.json({ answers });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return new Response(message, { status: 500 });
  }
}
