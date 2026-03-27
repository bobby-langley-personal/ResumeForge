import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return new Response('Unauthorized', { status: 401 });

    const { resumeText, message, chatHistory = [] } = await req.json() as {
      resumeText: string;
      message: string;
      chatHistory: ChatMessage[];
    };

    if (!resumeText || !message) return new Response('resumeText and message required', { status: 400 });

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const { SONNET } = await getModels();

    const history = chatHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 6000,
      system: `You are a resume writing expert helping the user refine their base resume — a comprehensive master resume that covers their full career history.

The user's current base resume:
<base_resume>
${resumeText}
</base_resume>

Rules:
- If the user asks you to make a change, respond with CHANGE: followed by the complete updated resume text
- If the user asks a question or wants advice (no change needed), respond with ANSWER: followed by your response
- When making changes, preserve ALL experience — this is a base resume, do not remove roles or cut content unless the user explicitly asks
- Apply the same bullet point rules: specific metrics, no hedging, no repeated action verbs, max 180 chars per bullet
- Never use CHANGE: and ANSWER: in the same response`,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    if (text.startsWith('CHANGE:')) {
      return Response.json({ type: 'change', content: text.slice('CHANGE:'.length).trim() });
    } else {
      const content = text.startsWith('ANSWER:') ? text.slice('ANSWER:'.length).trim() : text;
      return Response.json({ type: 'answer', content });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[base-resume-chat]', msg);
    return new Response(msg, { status: 500 });
  }
}
