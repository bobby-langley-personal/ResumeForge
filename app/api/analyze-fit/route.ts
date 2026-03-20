import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { parseStageJSON } from '@/lib/pipeline-utils';
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

    const { company, jobTitle, jobDescription, backgroundExperience } = await req.json();
    if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
      return new Response('Missing required fields', { status: 400 });
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const { HAIKU } = await getModels();

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1500,
      system: `You are a brutally honest but constructive career advisor.
Analyze how well the candidate's background matches the job description. Be specific — name actual skills, tools, and experiences that match or are missing. Do not be generic.
Adapt your analysis based on the role type (technical, management, sales, customer success, research).

Output valid JSON only, no markdown fences:
{
  "overallFit": "Strong Fit" | "Good Fit" | "Stretch Role",
  "strengths": ["string", "string", "string"],
  "gaps": ["string", "string", "string"],
  "suggestions": ["string", "string", "string"],
  "roleType": "technical" | "management" | "sales" | "customer_success" | "research" | "other"
}`,
      messages: [
        {
          role: 'user',
          content: `Job Title: ${jobTitle}\nCompany: ${company}\nJob Description: ${jobDescription}\n\nCandidate Background:\n${backgroundExperience}\n\nAnalyze the fit between this candidate and the role.`
        }
      ]
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    console.log('[analyze-fit] Raw model response length:', text.length);
    console.log('[analyze-fit] Raw model response:', text.slice(0, 300));

    const fitAnalysis = parseStageJSON<FitAnalysis>(text);
    console.log('[analyze-fit] Parsed successfully:', JSON.stringify(fitAnalysis).slice(0, 200));

    return Response.json(fitAnalysis);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('[analyze-fit] Failed:', message);
    return new Response(message, { status: 500 });
  }
}
