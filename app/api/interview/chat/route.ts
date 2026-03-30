export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface SystemContext {
  companyResearch?: string;
  existingDocuments?: string;
  currentRole: { company: string; title: string };
  rolesRemaining: number;
}

interface RequestBody {
  message: string;
  history: ChatMessage[];
  systemContext: SystemContext;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
  }

  const body: RequestBody = await req.json();
  const { message, history, systemContext } = body;
  const { currentRole, companyResearch, existingDocuments, rolesRemaining } = systemContext;

  const contextSections: string[] = [];

  if (companyResearch) {
    contextSections.push(`Company & role context:\n${companyResearch}`);
  }

  if (existingDocuments) {
    contextSections.push(`Candidate's existing documents (use to avoid redundancy and ask about gaps):\n${existingDocuments}`);
  }

  if (rolesRemaining > 1) {
    contextSections.push(`Note: After this role, there ${rolesRemaining - 1 === 1 ? 'is' : 'are'} ${rolesRemaining - 1} more role${rolesRemaining - 1 === 1 ? '' : 's'} to cover. Keep this role's interview focused.`);
  }

  const systemPrompt = `You are an expert career coach conducting a structured but conversational interview to help a job candidate build a detailed work experience document.

You are currently interviewing them about their role as ${currentRole.title} at ${currentRole.company}.

Your goal is to capture everything valuable about their experience — especially things they might overlook because they seem obvious.

${contextSections.length > 0 ? contextSections.join('\n\n') + '\n\n' : ''}Interview rules:
- Ask ONE question at a time — never multiple questions in one message
- Think between questions — reflect on what was just said before deciding what to ask next
- Ask follow-up questions when an answer hints at something interesting or incomplete:
  - If they mention a metric, ask how they achieved it
  - If they mention a tool, ask how deeply they used it
  - If they mention a project, ask what the outcome was
- Offer yes/no or multiple choice questions when it makes answering easier
- Cover these areas for every role (in natural conversational order):
  • Team structure and their specific role
  • Key responsibilities and daily work
  • Tools, platforms, technologies used
  • Problems solved, incidents handled, fires put out
  • Processes built, improved, or documented
  • Metrics and outcomes contributed to
  • Cross-functional collaboration
  • Things they're proud of that aren't on their resume
- Be warm, encouraging, and genuinely curious
- Help them see the value in experiences they might dismiss

When offering a yes/no or multiple choice question, end your message with choices on their own line in this exact format:
CHOICES: Option A | Option B | Option C

When you have covered enough ground for a thorough document (typically 8–15 exchanges), signal readiness to wrap up with:
CHOICES: Move to next role | Keep going

Always be warm, encouraging, and curious. Help them see the value in experiences they might dismiss.`;

  const { SONNET } = await getModels();
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const messages: ChatMessage[] = [
    ...history,
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: SONNET,
    max_tokens: 1024,
    temperature: 0.5,
    system: systemPrompt,
    messages,
  });

  const content = response.content[0];
  if (content.type !== 'text') return new Response('Unexpected AI response', { status: 500 });

  return Response.json({ response: content.text });
}
