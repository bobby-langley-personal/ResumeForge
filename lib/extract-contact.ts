import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from './models';

export interface ContactFields {
  full_name: string;
  email: string;
  location: string;
  linkedin_url: string;
}

const EMPTY: ContactFields = { full_name: '', email: '', location: '', linkedin_url: '' };

export async function extractContactFields(text: string): Promise<ContactFields> {
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
      messages: [{ role: 'user', content: text.slice(0, 800) }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';
    const parsed = JSON.parse(raw);
    return {
      full_name: parsed.full_name ?? '',
      email: parsed.email ?? '',
      location: parsed.location ?? '',
      linkedin_url: parsed.linkedin_url ?? '',
    };
  } catch {
    return { ...EMPTY };
  }
}

/** Try up to maxDocs resume documents (most recent first), merging fields until all are filled. */
export async function inferContactFromDocs(
  docs: Array<{ item_type: string; content: unknown }>,
  maxDocs = 2,
): Promise<ContactFields> {
  const resumeDocs = docs
    .filter(d => d.item_type === 'resume' || d.item_type === 'other')
    .slice(0, maxDocs);

  const merged: ContactFields = { ...EMPTY };

  for (const doc of resumeDocs) {
    const allFilled = Object.values(merged).every(v => v !== '');
    if (allFilled) break;

    const raw = doc.content as any;
    const text: string = typeof raw === 'string'
      ? JSON.parse(raw).text
      : (raw?.text ?? '');
    if (!text) continue;

    const extracted = await extractContactFields(text);
    if (!merged.full_name && extracted.full_name) merged.full_name = extracted.full_name;
    if (!merged.email && extracted.email) merged.email = extracted.email;
    if (!merged.location && extracted.location) merged.location = extracted.location;
    if (!merged.linkedin_url && extracted.linkedin_url) merged.linkedin_url = extracted.linkedin_url;
  }

  return merged;
}
