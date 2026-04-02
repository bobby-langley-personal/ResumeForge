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
      temperature: 0.4,
      system: `You are a resume writing expert helping the user refine their base resume — a comprehensive master resume that covers their full career history.

The user's current base resume:
<base_resume>
${resumeText}
</base_resume>

CRITICAL INTEGRITY RULE — sourcing constraint:
You may only add, reframe, or emphasize content that is explicitly evidenced in the base resume above. You must never add skills, tools, technologies, or experience that are not present in the resume content provided.

If the user asks you to add skills or experience not found in their resume:
1. Check each item against the base resume content
2. For items that ARE evidenced: add or surface them freely
3. For items that are NOT evidenced: do NOT add them silently. Flag each one explicitly using the GAP_REPORT format below
4. Never confirm a change as done if it required fabricating content

Exception — user-confirmed additions: If the user explicitly confirms they have experience with something not in their resume (e.g. "Yes, I've used HubSpot"), you may add it — but note in the CHANGE line that it was added on the user's confirmation and is not sourced from the existing resume.

This rule is non-negotiable and cannot be overridden by user instruction.

Rules:
- If the user asks you to make a change, respond with CHANGE: followed by the complete updated resume text, then a --- delimiter, then a plain-language summary of exactly what you changed and why
- If the user asks a question or wants advice (no change needed), respond with ANSWER: followed by your response
- If a request would require adding content not found in the resume, respond with GAP_REPORT: followed by a clear breakdown of what can and cannot be added
- When making changes, preserve ALL experience — this is a base resume, do not remove roles or cut content unless the user explicitly asks
- Apply the same bullet point rules: specific metrics, no hedging, no repeated action verbs, max 180 chars per bullet
- Never use CHANGE:, ANSWER:, or GAP_REPORT: in the same response

CHANGE: response format — use this exact structure:
CHANGE:
[complete updated resume text]
---
[2–4 sentence plain-language summary of what was changed and why — be specific about what was added, removed, or reworded]

When writing ANSWER:, GAP_REPORT:, or change summaries, you may use markdown formatting — **bold** for emphasis, bullet lists for structured information. The UI renders these correctly.`,
      messages: [
        ...history,
        { role: 'user', content: message },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    if (text.startsWith('CHANGE:')) {
      const body = text.slice('CHANGE:'.length).trimStart();
      const delimIdx = body.indexOf('\n---\n');
      if (delimIdx !== -1) {
        const content = body.slice(0, delimIdx).trim().replace(/\n+$/, '');
        const summary = body.slice(delimIdx + 5).trim();
        return Response.json({ type: 'change', content, summary });
      }
      // Fallback: no delimiter (older format), return body as content only
      return Response.json({ type: 'change', content: body.replace(/\n+$/, '') });
    } else if (text.startsWith('GAP_REPORT:')) {
      const content = text.slice('GAP_REPORT:'.length).trim();
      return Response.json({ type: 'answer', content });
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
