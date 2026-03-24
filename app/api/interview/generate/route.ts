export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

interface InterviewAnswer {
  question: string;
  answer: string;
}

interface InterviewRole {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  answers: InterviewAnswer[];
}

interface RequestBody {
  roles: InterviewRole[];
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { roles } = body;
  if (!roles?.length) return new Response('No roles provided', { status: 400 });

  const transcript = roles
    .map((role, i) => {
      const qa = role.answers
        .map(a => `Q: ${a.question}\nA: ${a.answer}`)
        .join('\n\n');
      return `=== Role ${i + 1}: ${role.title} at ${role.company} (${role.startDate} – ${role.endDate}) ===\n\n${qa}`;
    })
    .join('\n\n\n');

  const { SONNET } = await getModels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    system: `You are an expert career coach. Based on this job interview transcript, write a detailed, well-organized experience document that captures everything the candidate shared.

Format:
- One section per role with company, title, and dates as a header
- Bullet points for responsibilities, tools, and achievements
- Preserve specific metrics, numbers, and outcomes exactly as stated
- Include things that seem obvious — they matter to hiring managers
- Write in first person, past tense for previous roles
- Do not summarize or compress — capture everything shared

This document will be used as AI context for resume tailoring, so more detail is always better than less.`,
    messages: [
      {
        role: 'user',
        content: `Here is my career interview transcript. Please write my experience document.\n\n${transcript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') {
    return new Response('Unexpected response from AI', { status: 500 });
  }

  return Response.json({ document: content.text });
}
