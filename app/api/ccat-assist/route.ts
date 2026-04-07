import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getModels } from '@/lib/models'

const SYSTEM = `You are a cognitive aptitude test expert specializing in the CCAT (Criteria Cognitive Aptitude Test).

CRITICAL RULES — follow exactly:
- Word analogies: identify the PRECISE relationship direction. Example: "FROG is to TADPOLE" = adult→juvenile form. The answer pair must follow the SAME direction (adult→juvenile), not the reverse. Never pick the reversed direction.
- Math: compute step by step with exact arithmetic — never estimate.
- Antonyms: choose the word most nearly OPPOSITE in meaning.
- Number series: state the exact rule (e.g. +3, ×2) before choosing.
- Logic syllogisms: only conclude what is strictly entailed by the premises — no assumptions.

Output ONLY valid JSON with no markdown, no explanation outside the JSON, no preamble.`

function buildPrompt(question: string, options: string[], rawText: string, url: string): string {
  const labels = ['A', 'B', 'C', 'D', 'E']
  const hasStructured = question?.length > 0 && options?.length > 0

  if (hasStructured) {
    return `QUESTION:
${question}

OPTIONS:
${options.map((o, i) => `${labels[i]}) ${o}`).join('\n')}

Return ONLY valid JSON:
{"question":${JSON.stringify(question)},"options":${JSON.stringify(options)},"recommendedAnswer":"<LETTER>","recommendedAnswerText":"<exact text of the correct option>","reasoning":"<2-3 sentences: state the rule/relationship and direction, apply it, explain why other options are wrong>","confidence":"<high|medium|low>"}`
  }

  return `PAGE TEXT:
${rawText?.slice(0, 8000)}

PAGE URL: ${url}

Find the current CCAT question. Extract the question stem and all answer options (A–E).

Return ONLY valid JSON:
{"question":"<question text>","options":["<A>","<B>","<C>","<D>","<E>"],"recommendedAnswer":"<LETTER>","recommendedAnswerText":"<exact text>","reasoning":"<2-3 sentences>","confidence":"<high|medium|low>"}

recommendedAnswer must be A, B, C, D, or E. Pad options with empty strings only if fewer than 5 exist.`
}

async function callModel(anthropic: Anthropic, model: string, system: string, prompt: string) {
  const response = await anthropic.messages.create({
    model,
    max_tokens: 1024,
    temperature: 0.1,
    system,
    messages: [{ role: 'user', content: prompt }],
  })
  const text = (response.content[0] as { type: string; text: string }).text
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned)
}

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

    const { HAIKU, SONNET } = await getModels()
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const prompt = buildPrompt(question, options, rawText, url)

    // Run both models in parallel
    const [haikuResult, sonnetResult] = await Promise.all([
      callModel(anthropic, HAIKU, SYSTEM, prompt).catch(e => ({ error: String(e) })),
      callModel(anthropic, SONNET, SYSTEM, prompt).catch(e => ({ error: String(e) })),
    ])

    return Response.json({ haiku: haikuResult, sonnet: sonnetResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[ccat-assist] Error:', message)
    return new Response(message, { status: 500 })
  }
}
