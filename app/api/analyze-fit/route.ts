import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON, buildContextBlock } from '@/lib/pipeline-utils';
import { FitAnalysis, KeywordTranslation } from '@/types/fit-analysis';

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

    const userContent = `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}${artifactList}\n\nPrimary Resume / Background:\n${backgroundExperience}${contextBlock}`;

    // Run Haiku fit analysis and Sonnet keyword translation in parallel
    const [fitResponse, translationResponse] = await Promise.all([
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

Output valid JSON only, no markdown fences:
{
  "overallFit": "Strong Fit" | "Good Fit" | "Stretch Role",
  "strengths": [{"point": "string", "source": "artifact name"}, ...],
  "gaps": [{"point": "string", "source": "artifact name"}, ...],
  "suggestions": [{"point": "string", "source": "artifact name"}, ...],
  "plannedImprovements": ["string", "string", "string"],
  "roleType": "technical" | "management" | "sales" | "customer_success" | "research" | "other"
}`,
        messages: [{ role: 'user', content: `${userContent}\n\nAnalyze the fit between this candidate and the role.` }],
      }),

      anthropic.messages.create({
        model: SONNET,
        max_tokens: 1000,
        temperature: 0.2,
        system: `You are identifying honest keyword translations — cases where the candidate performed the same core activity as a JD term describes, but used different language to describe it.

VALID translation: the candidate was doing the same thing.
INVALID translation: the candidate was in the same general domain but doing something different.

Examples of INVALID mappings — do not make these:
- "delivered client training" → "troubleshoot complex technical issues"
  (training ≠ troubleshooting — different activities)
- "sent stakeholder updates during rollouts" → "incident management"
  (planned rollout communication ≠ unplanned incident response)
- "used reporting tools" → "data analytics"
  (too vague — only map if a specific tool or methodology is named)

Examples of VALID mappings:
- "Zendesk, Jira" → "ticketing systems (Zendesk, HubSpot, or similar)"
  (direct tool match)
- "99% retention, owned renewal relationships" → "trusted advisor"
  (same relationship dynamic described differently)

Additional rules:
- Only include entries where the candidate's phrase is genuinely different from the JD term (no verbatim matches)
- Do NOT fabricate — only map if the candidate's phrase clearly and specifically maps to the JD term
- When uncertain whether a mapping is honest, omit it entirely
- Return an empty array rather than a weak mapping
- Quality over quantity — three accurate entries are better than six where two are questionable
- Maximum 6 entries; assign a confidence level to each

Output valid JSON only, no markdown fences:
[{"jdTerm": "string", "candidatePhrase": "string", "confidence": "high" | "medium" | "low"}, ...]`,
        messages: [{ role: 'user', content: `${userContent}\n\nIdentify keyword translations between the JD and the candidate's background.` }],
      }),
    ]);

    const fitText = fitResponse.content[0].type === 'text' ? fitResponse.content[0].text : '';
    console.log('[analyze-fit] Haiku response length:', fitText.length);
    console.log('[analyze-fit] Haiku response:', fitText.slice(0, 500));

    const fitAnalysis = parseStageJSON<Omit<FitAnalysis, 'keywordTranslations'>>(fitText);
    console.log('[analyze-fit] Fit analysis parsed:', JSON.stringify(fitAnalysis).slice(0, 300));

    // Parse keyword translations — log all, surface only high confidence
    const translationText = translationResponse.content[0].type === 'text' ? translationResponse.content[0].text : '[]';
    let allTranslations: KeywordTranslation[] = [];
    try {
      allTranslations = parseStageJSON<KeywordTranslation[]>(translationText);
    } catch {
      console.warn('[analyze-fit] Failed to parse keyword translations:', translationText.slice(0, 200));
    }
    const medLow = allTranslations.filter(t => t.confidence !== 'high');
    if (medLow.length > 0) {
      console.log('[analyze-fit] Suppressed medium/low confidence translations:', JSON.stringify(medLow));
    }
    const keywordTranslations = allTranslations.filter(t => t.confidence === 'high');

    return Response.json({ ...fitAnalysis, keywordTranslations });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analyze-fit] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
