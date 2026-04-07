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
    const labels = ['A', 'B', 'C', 'D']

    const prompt = hasStructured
      ? `You are a cognitive aptitude test tutor. A user is taking an online aptitude test.

DETECTED QUESTION:
${question}

DETECTED OPTIONS:
${options.map((o: string, i: number) => `${labels[i]}) ${o}`).join('\n')}

Determine the correct answer and explain the reasoning clearly.

Return ONLY valid JSON matching this exact shape (no markdown, no preamble):
{"question":"${question.replace(/"/g, '\\"')}","options":${JSON.stringify(options)},"recommendedAnswer":"A","recommendedAnswerText":"the text of the correct option","reasoning":"2-3 sentences explaining why this is correct and the underlying pattern or logic to remember","confidence":"high"}`
      : `You are a cognitive aptitude test tutor. A user is taking an online aptitude test and has shared the full text of their current test page.

PAGE TEXT (truncated to 6000 chars):
${rawText?.slice(0, 6000)}

PAGE URL: ${url}

Your task:
1. Find the current test question on this page — it may be verbal, math/logic, or spatial reasoning.
2. Extract the question and answer options (typically A/B/C/D or labeled 1-4).
3. Identify the correct answer and explain the reasoning.

Return ONLY valid JSON (no markdown, no preamble):
{
  "question": "the question text",
  "options": ["option A text", "option B text", "option C text", "option D text"],
  "recommendedAnswer": "A",
  "recommendedAnswerText": "the text of the correct option",
  "reasoning": "2-3 sentences explaining why this answer is correct and the pattern/logic to remember for similar questions",
  "confidence": "high"
}

If you cannot find a clear aptitude question, set confidence to "low" and explain in reasoning.
options must have exactly 4 strings — pad with empty strings if fewer were found.
recommendedAnswer must be A, B, C, or D.`

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
