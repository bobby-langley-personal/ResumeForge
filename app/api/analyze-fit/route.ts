import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON, buildContextBlock } from '@/lib/pipeline-utils';
import { FitAnalysis } from '@/types/fit-analysis';
import { computeMatchScore } from '@/lib/keyword-score';
import { logApiCall } from '@/lib/log-api';

export async function POST(req: NextRequest) {
  const startMs = Date.now();
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
    const { HAIKU } = await getModels();

    // Run both Haiku calls in parallel: fit analysis + keyword extraction from JD
    const [response, keywordResponse] = await Promise.all([
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
        messages: [
          {
            role: 'user',
            content: `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}${artifactList}\n\nPrimary Resume / Background:\n${backgroundExperience}${contextBlock}\n\nAnalyze the fit between this candidate and the role.`
          }
        ]
      }),

      // Keyword extraction: normalized lowercase lemmas from JD requirements
      anthropic.messages.create({
        model: HAIKU,
        max_tokens: 1000,
        temperature: 0.2,
        system: `Extract every required and preferred skill, tool, technology, methodology, and qualification from the job description.
Normalize each to a lowercase lemma (e.g. "React.js" → "react", "Machine Learning" → "machine learning").
Include both hard skills (languages, tools, platforms) and soft skills only if explicitly required (e.g. "excellent written communication").
Exclude generic filler phrases like "team player", "self-starter", "fast-paced environment".
Output valid JSON only, no markdown fences: { "keywords": ["keyword1", "keyword2", ...] }`,
        messages: [
          {
            role: 'user',
            content: `Job Title: ${jobTitle}\nJob Description: ${jobDescription}\n\nExtract all required and preferred keywords.`
          }
        ]
      })
    ]);

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[analyze-fit] Raw model response length:', text.length);
    console.log('[analyze-fit] Raw model response:', text.slice(0, 500));

    const fitAnalysis = parseStageJSON<FitAnalysis>(text);
    console.log('[analyze-fit] Parsed successfully:', JSON.stringify(fitAnalysis).slice(0, 300));

    // Parse keywords and compute deterministic match score
    const kwText = keywordResponse.content[0].type === 'text' ? keywordResponse.content[0].text : '';
    let keywords: string[] = [];
    try {
      const parsed = parseStageJSON<{ keywords: string[] }>(kwText);
      keywords = Array.isArray(parsed?.keywords) ? parsed.keywords.map(k => k.toLowerCase()) : [];
    } catch {
      console.warn('[analyze-fit] Keyword extraction failed to parse, skipping score');
    }

    const { score: matchScore, matched, missing } = computeMatchScore(keywords, backgroundExperience);
    if (fitAnalysis && keywords.length > 0) {
      fitAnalysis.matchScore = matchScore;
      fitAnalysis.keywords = { matched, missing };
    }

    logApiCall({
      user_id: userId,
      route: '/api/analyze-fit',
      method: 'POST',
      status_code: 200,
      request_body: { company, jobTitle },
      response_summary: { overallFit: fitAnalysis?.overallFit, roleType: fitAnalysis?.roleType },
      duration_ms: Date.now() - startMs,
      source: req.headers.get('x-extension-version') ? 'extension' : 'webapp',
    });

    return Response.json(fitAnalysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analyze-fit] Failed:', message);
    logApiCall({
      route: '/api/analyze-fit',
      method: 'POST',
      status_code: 500,
      error: message,
      duration_ms: Date.now() - startMs,
    });
    return new Response(message, { status: 500 });
  }
}
