export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('Server configuration error', { status: 500 });
  }

  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const { transcript, question, context } = await req.json() as {
    transcript: string;
    question: string;
    context: string;
  };

  if (!transcript && !question) {
    return new Response('transcript or question is required', { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const { HAIKU } = await getModels();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const messageStream = anthropic.messages.stream({
          model: HAIKU,
          max_tokens: 512,
          system: `You are a real-time interview assistant helping a candidate during a live interview or meeting.

CANDIDATE BACKGROUND:
${context || '(No background provided)'}

Your role:
- Suggest concise, confident answers the candidate can use immediately
- Reference specific experience from their background when relevant
- Write in first person as the candidate
- Keep responses brief: 2–4 sentences unless the question clearly needs more detail
- Be direct — no preamble, no "Here's how you could answer..."`,
          messages: [
            {
              role: 'user',
              content: question?.trim()
                ? `Help me answer this question: "${question}"\n\nRecent conversation:\n${transcript}`
                : `Based on this conversation, suggest what I should say next:\n\n${transcript}`,
            },
          ],
        });

        for await (const event of messageStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            send({ type: 'chunk', text: event.delta.text });
          }
        }

        send({ type: 'done' });
      } catch (err) {
        send({ type: 'error', message: err instanceof Error ? err.message : 'Suggestion failed' });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
