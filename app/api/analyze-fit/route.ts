import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON, buildContextBlock } from '@/lib/pipeline-utils';
import { FitAnalysis, KeywordTranslation, TenseCorrection } from '@/types/fit-analysis';

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response('ANTHROPIC_API_KEY not set', { status: 500 });
    }

    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { company, jobTitle, jobDescription, backgroundExperience, additionalContext = [] } = await req.json();
    if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
      return new Response('Missing required fields', { status: 400 });
    }

    const contextBlock = buildContextBlock(additionalContext);

    // Build artifact name list so the model can tag sources
    const artifactList = additionalContext.length > 0
      ? `\nAvailable artifacts (by name): "Primary Resume"${additionalContext.map((a: { title: string }) => `, "${a.title}"`).join('')}`
      : '';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { HAIKU, SONNET } = await getModels();

    const [fitResponse, keywordResponse] = await Promise.all([
      anthropic.messages.create({
        model: HAIKU,
        max_tokens: 4000,
        temperature: 0.2,
        system: `You are a brutally honest but constructive career advisor.
Analyze how well the candidate's background matches the job description. Be specific — name actual skills, tools, and experiences that match or are missing. Do not be generic.
Adapt your analysis based on the role type (technical, management, sales, customer success, research).

The candidate may have provided multiple context artifacts (resume, cover letter examples, portfolio notes, etc.).
For each strength, gap, and suggestion, include a "source" field naming which artifact the insight came from.
Use "Primary Resume" for insights from the main background. Use the exact artifact title for additional context items.
Omit "source" only if the insight is a general observation not tied to any specific artifact.

Also include a "plannedImprovements" array: 3-5 specific, concrete changes that will be made to the generated resume
compared to the candidate's original. Examples: reframing a job title, surfacing a buried metric, adding missing keywords,
restructuring bullet points, cutting irrelevant experience. Be specific — name real content from their background.

Within each array, order items by importance — most impactful first. The first 3 items in each array are shown by default, so lead with the strongest signal.

Also include a "tenseCorrections" array: scan the candidate's background for resume bullets that open with a present-tense verb (e.g. "Manage", "Lead", "Build", "Drive", "Own", "Support", "Oversee", "Handle", "Develop", "Create", "Work"). For each one found, include the original text (trimmed to the first ~60 chars) and the corrected past-tense version. Limit to at most 8. If none found, return [].

Output valid JSON only, no markdown fences:
{
  "overallFit": "Strong Fit" | "Good Fit" | "Stretch Role",
  "strengths": [{"point": "string", "source": "artifact name"}, ...],
  "gaps": [{"point": "string", "source": "artifact name"}, ...],
  "suggestions": [{"point": "string", "source": "artifact name"}, ...],
  "plannedImprovements": ["string", "string", "string"],
  "roleType": "technical" | "management" | "sales" | "customer_success" | "research" | "other",
  "tenseCorrections": [{"original": "string", "corrected": "string"}, ...]
}`,
        messages: [
          {
            role: 'user',
            content: `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}${artifactList}\n\nPrimary Resume / Background:\n${backgroundExperience}${contextBlock}\n\nAnalyze the fit between this candidate and the role.`
          }
        ]
      }),
      anthropic.messages.create({
        model: SONNET,
        max_tokens: 600,
        temperature: 0.2,
        system: `You are a resume language expert. Compare the terminology in the job description against the candidate's resume.

Identify cases where the candidate uses equivalent language but different phrasing from the JD — where the underlying skill or activity is the same but the words differ.

VALID mappings — different words, same activity:
- JD says "pipeline management", candidate says "deal tracking"
- JD says "stakeholder alignment", candidate says "cross-functional coordination"
- JD says "churn prevention", candidate says "customer retention"

INVALID mappings — do not include these:
- Same activity described at different seniority levels ("led" vs "supported")
- Broad category matched to specific tool ("communication" → "Slack")
- Skills the candidate doesn't have (do not invent mappings)
- Obvious synonyms the reader would already understand

For each mapping, assign a confidence: "high" if clearly equivalent, "medium" if plausible but not certain, "low" if speculative.

Output JSON only, no markdown fences: {"translations": [{"jdTerm": "...", "candidatePhrase": "...", "confidence": "high"|"medium"|"low"}, ...]}
If no clear mappings exist, return {"translations": []}.`,
        messages: [
          {
            role: 'user',
            content: `Job Description:\n${jobDescription}\n\nCandidate Resume:\n${backgroundExperience}${contextBlock}`
          }
        ]
      }),
    ]);

    const fitText = fitResponse.content[0].type === 'text' ? fitResponse.content[0].text : '';
    console.log('[analyze-fit] Raw model response length:', fitText.length);
    console.log('[analyze-fit] Raw model response:', fitText.slice(0, 500));

    const fitAnalysis = parseStageJSON<FitAnalysis>(fitText);
    console.log('[analyze-fit] Parsed successfully:', JSON.stringify(fitAnalysis).slice(0, 300));

    // Parse tense corrections from fit response
    const rawTenseCorrections = Array.isArray(fitAnalysis.tenseCorrections) ? fitAnalysis.tenseCorrections : [];
    const tenseCorrections: TenseCorrection[] = rawTenseCorrections
      .filter((t: unknown): t is TenseCorrection =>
        typeof (t as TenseCorrection)?.original === 'string' &&
        typeof (t as TenseCorrection)?.corrected === 'string'
      )
      .slice(0, 8);

    // Parse keyword translations from Sonnet call
    const kwText = keywordResponse.content[0].type === 'text' ? keywordResponse.content[0].text : '{}';
    let keywordTranslations: KeywordTranslation[] = [];
    try {
      const kwParsed = parseStageJSON<{ translations: unknown[] }>(kwText);
      const raw = Array.isArray(kwParsed.translations) ? kwParsed.translations : [];
      keywordTranslations = raw
        .filter((t: unknown): t is KeywordTranslation =>
          typeof (t as KeywordTranslation)?.jdTerm === 'string' &&
          typeof (t as KeywordTranslation)?.candidatePhrase === 'string' &&
          ['high', 'medium', 'low'].includes((t as KeywordTranslation)?.confidence)
        )
        .filter((t: KeywordTranslation) => t.confidence === 'high')
        .slice(0, 8);
      console.log('[analyze-fit] Keyword translations (high confidence):', keywordTranslations.length);
    } catch {
      console.warn('[analyze-fit] Keyword translation parse failed');
    }

    return Response.json({ ...fitAnalysis, keywordTranslations, tenseCorrections });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analyze-fit] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
