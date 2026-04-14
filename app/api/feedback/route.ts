export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';
import Anthropic from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const GITHUB_REPO = process.env.GITHUB_FEEDBACK_REPO ?? 'bobby-langley-personal/ResumeForge';
const GITHUB_ASSIGNEE = 'bobby-langley-personal';

async function createGitHubIssue(
  type: 'general' | 'bug',
  message: string,
  fromLabel: string,
): Promise<string | null> {
  if (!GITHUB_TOKEN) return null;

  try {
    const client = new Anthropic();
    const { HAIKU } = await getModels();
    const aiRes = await client.messages.create({
      model: HAIKU,
      max_tokens: 200,
      temperature: 0.3,
      messages: [{
        role: 'user',
        content: `Write a concise GitHub issue title (max 60 chars, no quotes) and a one-sentence TL;DR summary for this user feedback.\n\nType: ${type}\nMessage: ${message}\n\nRespond in exactly this format:\nTITLE: <title>\nSUMMARY: <summary>`,
      }],
    });

    const text = aiRes.content[0].type === 'text' ? aiRes.content[0].text : '';
    const title = text.match(/TITLE:\s*(.+)/)?.[1]?.trim() ?? `[${type}] User feedback`;
    const summary = text.match(/SUMMARY:\s*(.+)/)?.[1]?.trim() ?? message.slice(0, 120);

    const label = type === 'bug' ? 'bug' : 'enhancement';
    const body = [
      `**From:** ${fromLabel}`,
      `**Type:** ${type === 'bug' ? 'Bug Report' : 'General Feedback'}`,
      '',
      '## Message',
      message,
      '',
      '## TL;DR',
      summary,
      '',
      `cc @${GITHUB_ASSIGNEE}`,
    ].join('\n');

    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/issues`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        title: `[${type === 'bug' ? 'Bug' : 'Feedback'}] ${title}`,
        body,
        assignees: [GITHUB_ASSIGNEE],
        labels: [label],
      }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { html_url: string };
    return data.html_url;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  let body: { type?: string; message?: string; anonymous?: boolean };
  try {
    body = await req.json();
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  const { type, message, anonymous = false } = body;
  if (!type || !message?.trim()) return new Response('Missing fields', { status: 400 });
  if (type !== 'general' && type !== 'bug') return new Response('Invalid type', { status: 400 });

  const trimmed = message.trim();

  // Resolve user email for non-anonymous submissions
  let userEmail: string | null = null;
  if (!anonymous) {
    const user = await currentUser();
    userEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
  }

  const fromLabel = anonymous ? 'Anonymous' : (userEmail ?? `User ${userId}`);

  // Fire GitHub issue creation and DB insert in parallel
  const [issueUrl] = await Promise.all([
    createGitHubIssue(type as 'general' | 'bug', trimmed, fromLabel),
    supabaseServer().from('feedback').insert({
      user_id: userId,
      type: type as 'general' | 'bug',
      message: trimmed,
    }),
  ]);

  return Response.json({ issueUrl }, { status: 200 });
}
