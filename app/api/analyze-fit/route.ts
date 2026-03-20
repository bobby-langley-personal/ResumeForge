import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON, buildContextBlock } from '@/lib/pipeline-utils';
import { FitAnalysis } from '@/types/fit-analysis';

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

    // Build a list of artifact names so the model can reference them
    const artifactList = additionalContext.length > 0
      ? `\nAvailable artifacts (by name): "Primary Resume"${additionalContext.map((a: { title: string }) => `, "${a.title}"`).join('')}`
      : '';

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { HAIKU } = await getModels();

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 4000,
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
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[analyze-fit] Raw model response length:', text.length);
    console.log('[analyze-fit] Raw model response:', text.slice(0, 500));

    const fitAnalysis = parseStageJSON<FitAnalysis>(text);
    console.log('[analyze-fit] Parsed successfully:', JSON.stringify(fitAnalysis).slice(0, 300));

    return Response.json(fitAnalysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analyze-fit] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
