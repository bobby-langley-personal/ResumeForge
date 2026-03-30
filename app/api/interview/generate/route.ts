export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface InterviewTranscript {
  company: string;
  title: string;
  startDate: string;
  endDate: string;
  history: ChatMessage[];
}

interface RequestBody {
  transcript: InterviewTranscript[];
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

  const { transcript } = body;
  if (!transcript?.length) return new Response('No transcript provided', { status: 400 });

  const formattedTranscript = transcript
    .map((role, i) => {
      const conversation = role.history
        .map(m => `${m.role === 'user' ? 'Candidate' : 'Interviewer'}: ${m.content}`)
        .join('\n\n');
      return `=== Role ${i + 1}: ${role.title} at ${role.company} (${role.startDate} – ${role.endDate}) ===\n\n${conversation}`;
    })
    .join('\n\n\n');

  const { SONNET } = await getModels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const message = await client.messages.create({
    model: SONNET,
    max_tokens: 4096,
    temperature: 0.3,
    system: `You are an expert career coach. Based on this interview transcript, write a detailed, well-organized experience document that captures everything the candidate shared.

Format per role:
[Company Name] | [Start] – [End]
[Job Title]

Then bullet points covering all of the following that were discussed:
- Key responsibilities and what they owned day-to-day
- Tools, platforms, and technologies used (be specific)
- Problems solved, incidents handled, improvements made
- Processes built, documented, or improved
- Metrics and outcomes (preserve exact numbers)
- Cross-functional work and collaboration
- Achievements and things they're proud of
- Anything else mentioned

Rules:
- Capture everything — do not summarize or compress
- Preserve specific metrics, tools, and outcomes exactly as stated
- Include things that seem obvious — they matter to hiring managers
- Write in implied first person (no "I" — just start with the verb: "Led...", "Built...", "Managed...")
- If something was mentioned briefly, still include it
- More detail is always better than less — this is AI context for resume tailoring`,
    messages: [
      {
        role: 'user',
        content: `Here is my career interview transcript. Please write my experience document.\n\n${formattedTranscript}`,
      },
    ],
  });

  const content = message.content[0];
  if (content.type !== 'text') return new Response('Unexpected response from AI', { status: 500 });

  return Response.json({ document: content.text });
}
