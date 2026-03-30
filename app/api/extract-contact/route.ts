import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await req.json() as { text: string };
  if (!text) return NextResponse.json({ full_name: '', email: '', location: '', linkedin_url: '' });

  try {
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const { HAIKU } = await getModels();

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 200,
      system: `Extract contact info from resume text. Return valid JSON only — no markdown, no fences.
Schema: { "full_name": "", "email": "", "location": "", "linkedin_url": "" }
- full_name: candidate's full name (first + last)
- email: email address
- location: city and state only, e.g. "Palm Beach, FL"
- linkedin_url: just the path, e.g. "linkedin.com/in/bobby-langley"
Use empty string for any field not found.`,
      messages: [{
        role: 'user',
        // Only send first ~800 chars — contact info is always at the top
        content: text.slice(0, 800),
      }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const parsed = JSON.parse(raw);
    return NextResponse.json({
      full_name: parsed.full_name ?? '',
      email: parsed.email ?? '',
      location: parsed.location ?? '',
      linkedin_url: parsed.linkedin_url ?? '',
    });
  } catch (err) {
    console.error('[extract-contact]', err);
    // Return empty — WelcomeScreen will show blank form for user to fill
    return NextResponse.json({ full_name: '', email: '', location: '', linkedin_url: '' });
  }
}
