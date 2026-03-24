export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

interface ExtractedRole {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
  }

  const { documents } = await req.json();
  if (!documents?.length) return Response.json({ roles: [] });

  const combined = (documents as { title: string; text: string }[])
    .map(d => `--- ${d.title} ---\n${d.text.slice(0, 6000)}`)
    .join('\n\n');

  const { HAIKU } = await getModels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: HAIKU,
    max_tokens: 512,
    system: `Extract work history from the provided documents. Return the most recent job roles in reverse chronological order (most recent first).

Return ONLY a JSON array — no markdown, no explanation, no code fences. Example:
[{"company":"Acme Corp","title":"Senior Engineer","startDate":"Jan 2022","endDate":"Present"},{"company":"Old Co","title":"Engineer","startDate":"Mar 2019","endDate":"Dec 2021"}]

Rules:
- Maximum 5 roles
- Use empty string "" for any field not found
- Dates should match the format found in the document (e.g. "Jan 2022", "2022", "March 2021")
- If no work history is found, return []`,
    messages: [{ role: 'user', content: combined }],
  });

  const content = message.content[0];
  if (content.type !== 'text') return Response.json({ roles: [] });

  try {
    // Haiku often wraps JSON in markdown fences despite instructions — strip them
    const stripped = content.text.replace(/```(?:json)?\s*/gi, '').replace(/```/g, '').trim();
    const jsonMatch = stripped.match(/\[[\s\S]*\]/);
    if (!jsonMatch) return Response.json({ roles: [] });
    const roles: ExtractedRole[] = JSON.parse(jsonMatch[0]);
    return Response.json({ roles: Array.isArray(roles) ? roles : [] });
  } catch {
    return Response.json({ roles: [] });
  }
}
