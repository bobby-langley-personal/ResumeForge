import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getModels } from '@/lib/models'

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response('ANTHROPIC_API_KEY not set', { status: 500 })
    }

    const { userId } = await auth()
    if (!userId) return new Response('Unauthorized', { status: 401 })

    const { question, options, rawText, url } = await req.json() as {
      question: string
      options: string[]
      rawText: string
      url: string
    }

    const { HAIKU } = await getModels()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const hasStructured = question?.length > 0 && options?.length > 0
    const labels = ['A', 'B', 'C', 'D', 'E']

    const prompt = hasStructured
      ? `You are a cognitive aptitude test tutor. A user is taking a CCAT (Criteria Cognitive Aptitude Test).

QUESTION:
${question}

OPTIONS:
${options.map((o: string, i: number) => `${labels[i]}) ${o}`).join('\n')}

Identify the correct answer and explain the reasoning clearly.

CRITICAL RULES:
- For word analogies (e.g. "A is to B as ___"): the DIRECTION of the relationship must match exactly. If A→B means "A is the adult form of B", the answer must also have X→Y where X is the adult form of Y — not reversed.
- For math questions: compute precisely, do not estimate.
- For antonyms: choose the word most nearly OPPOSITE, not a synonym.

Return ONLY valid JSON (no markdown, no preamble):
{"question":"${question.replace(/"/g, '\\"')}","options":${JSON.stringify(options)},"recommendedAnswer":"A","recommendedAnswerText":"the text of the correct option","reasoning":"2-3 sentences explaining why this is correct and the underlying pattern or logic to remember","confidence":"high"}`
      : `You are a cognitive aptitude test tutor. A user is taking a CCAT (Criteria Cognitive Aptitude Test) and has shared their current test page text.

PAGE TEXT:
${rawText?.slice(0, 8000)}

PAGE URL: ${url}

Your task:
1. Find the current test question — it may be verbal, math/logic, or spatial reasoning.
2. Extract the question stem and all answer options (CCAT uses A–E, 5 options).
3. Identify the correct answer and explain the reasoning.

Return ONLY valid JSON (no markdown, no preamble):
{
  "question": "the question text",
  "options": ["option A", "option B", "option C", "option D", "option E"],
  "recommendedAnswer": "A",
  "recommendedAnswerText": "the text of the correct option",
  "reasoning": "2-3 sentences explaining why this is correct and the pattern/logic to remember",
  "confidence": "high"
}

CCAT questions have 5 options (A–E). Pad with empty strings only if fewer were genuinely found.
recommendedAnswer must be A, B, C, D, or E.
If you cannot find a clear question, set confidence to "low" and explain in reasoning.`

    const response = await anthropic.messages.create({
      model: HAIKU,
      max_tokens: 1024,
      temperature: 0.1,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = (response.content[0] as { type: string; text: string }).text
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const result = JSON.parse(cleaned)

    return Response.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ccat-assist] Error:', message)
    return new Response(message, { status: 500 })
  }
}
