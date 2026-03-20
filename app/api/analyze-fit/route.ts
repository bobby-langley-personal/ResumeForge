export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { parseStageJSON } from '@/lib/pipeline-utils';
import { FitAnalysis } from '@/types/fit-analysis';

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return new Response('Server configuration error', { status: 500 });
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const { userId } = await auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { company, jobTitle, jobDescription, backgroundExperience } = await req.json();
  if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
    return new Response('Missing required fields', { status: 400 });
  }

  try {
    const response = await anthropic.messages.create({
      model: MODELS.HAIKU,
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
    const fitAnalysis = parseStageJSON<FitAnalysis>(text);

    return Response.json(fitAnalysis);
  } catch (error) {
    console.error('[analyze-fit] Error:', error);
    return new Response('Failed to analyze fit', { status: 500 });
  }
}
