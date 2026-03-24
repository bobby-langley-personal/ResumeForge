export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
  }

  const { company, title } = await req.json();
  if (!company || !title) return new Response('Missing company or title', { status: 400 });

  const { HAIKU } = await getModels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 512,
    system: `You are a knowledgeable career researcher. Given a company name and job title, write a concise 3–5 sentence summary covering:
1. What the company does (industry, product, size if known)
2. What someone in this role typically does day-to-day at this type of company
3. Common responsibilities, tools, or skills associated with the role

Be specific and factual. If the company is not well-known, infer from the name and context. Return plain text only — no markdown, no headers.`,
    messages: [
      {
        role: 'user',
        content: `Company: ${company}\nJob title: ${title}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') return new Response('Unexpected AI response', { status: 500 });

  return Response.json({ summary: content.text });
}
