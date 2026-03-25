import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

export const runtime = 'nodejs';

const SYSTEM_PROMPT = `You are an expert resume coach helping a candidate refine their resume for a specific role. You have full context of:
- Their generated resume (current version)
- The original job description
- Their background experience
- The full conversation history

When asked to make changes:
- Make the specific change requested and nothing else
- Return the COMPLETE updated resume text, preserving the exact format (name, contact line, section headers like SUMMARY, EXPERIENCE, EDUCATION, SKILLS, etc.)
- Briefly explain what you changed in 1 sentence
- Bullet point rules: never repeat the same action verb within a single role; never use hedging qualifiers like "Informally" or "Helped with"; if they led, they led

When asked questions (not changes):
- Answer directly using their actual resume content
- Reference specific bullet points or sections by name
- Do NOT return updated resume text for Q&A responses

Output format for changes — use this exact structure:
CHANGE: [one sentence description]
RESUME:
[complete updated resume]

Output format for Q&A — use this exact structure:
ANSWER:
[your response]`;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    applicationId,
    message,
    currentResumeText,
    originalResumeText,
    coverLetterText,
    jobDescription,
    company,
    jobTitle,
    backgroundExperience,
    chatHistory,
  } = await req.json();

  if (!message || !currentResumeText || !jobDescription) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify ownership if applicationId provided
  const supabase = supabaseServer();
  if (applicationId) {
    const { data: app } = await supabase
      .from('applications')
      .select('id, user_id')
      .eq('id', applicationId)
      .single();
    if (!app || app.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const contextBlock = `COMPANY: ${company}
JOB TITLE: ${jobTitle}

JOB DESCRIPTION:
${jobDescription}
${backgroundExperience ? `\nCANDIDATE BACKGROUND:\n${backgroundExperience}\n` : ''}
CURRENT RESUME:
${currentResumeText}
${originalResumeText && originalResumeText !== currentResumeText ? `\nORIGINAL RESUME (before edits):\n${originalResumeText}\n` : ''}${coverLetterText ? `\nCOVER LETTER:\n${coverLetterText}\n` : ''}`;

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { SONNET } = await getModels();

    const history: ChatMessage[] = (chatHistory ?? [])
      .filter((m: ChatMessage) => m.role === 'user' || m.role === 'assistant')
      .slice(-10); // last 10 turns

    const response = await anthropic.messages.create({
      model: SONNET,
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [
        { role: 'user', content: contextBlock },
        { role: 'assistant', content: 'Understood. I have full context of the role and your resume. What would you like to change or know?' },
        ...history,
        { role: 'user', content: message },
      ],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';

    if (text.startsWith('CHANGE:')) {
      const changeMatch = text.match(/^CHANGE:\s*(.+?)(?:\n|$)/);
      const resumeMatch = text.match(/RESUME:\s*\n([\s\S]+)/);
      const changeDesc = changeMatch?.[1]?.trim() ?? 'Resume updated.';
      const updatedResume = resumeMatch?.[1]?.trim() ?? '';

      // Persist: update resume_content and append to chat_history
      if (applicationId && updatedResume) {
        const newHistory: ChatMessage[] = [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: changeDesc },
        ];
        await supabase
          .from('applications')
          .update({ resume_content: updatedResume, chat_history: newHistory })
          .eq('id', applicationId)
          .eq('user_id', userId);
      }

      return NextResponse.json({ type: 'change', message: changeDesc, updatedResume });
    } else {
      const answerMatch = text.match(/^ANSWER:\s*\n?([\s\S]+)/);
      const answer = answerMatch?.[1]?.trim() ?? text.trim();
      return NextResponse.json({ type: 'answer', message: answer });
    }
  } catch (err) {
    console.error('[resume-chat]', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
