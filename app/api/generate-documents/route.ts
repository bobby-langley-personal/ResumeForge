export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { getModels } from '@/lib/models';
import { buildContextBlock, parseStageJSON } from '@/lib/pipeline-utils';
import { supabaseServer } from '@/lib/supabase';
import { FitAnalysis } from '@/types/fit-analysis';

export async function POST(req: NextRequest) {
  console.log('[generate-documents] Request received');
  
  try {
    // Check for ANTHROPIC_API_KEY at runtime
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error('[generate-documents] ANTHROPIC_API_KEY is not set');
      return new Response('Server configuration error', { status: 500 });
    }

    // Instantiate Anthropic client inside handler for edge functions
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    // Verify user is signed in
    const { userId } = await auth();
    if (!userId) {
      console.log('[generate-documents] Unauthorized request - no userId');
      return new Response('Unauthorized', { status: 401 });
    }
    console.log('[generate-documents] Auth check passed, userId:', userId);

    // Parse request body
    const { company, jobTitle, jobDescription, backgroundExperience, isFromUploadedFile, fitAnalysis: precomputedAnalysis, includeCoverLetter = false, includeSummary = false, additionalContext = [], jobUrl, questions = [], shortResponse = false } = await req.json();
    console.log('[generate-documents] Parsed body:', { 
      company, 
      jobTitle, 
      jobDescriptionLength: jobDescription?.length,
      backgroundLength: backgroundExperience?.length 
    });
    
    if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Create readable stream for SSE
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (type: string, data?: any) => {
          const event = { type, ...data };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        };

        try {
          let resumeText = '';
          let coverLetterText = '';
          let fitAnalysis: FitAnalysis | null = precomputedAnalysis ?? null;

          const { SONNET } = await getModels();

          // Phase 1: Generate resume
          sendEvent('status', { message: 'Analyzing job description...' });
          console.log('[generate-documents] Starting resume generation');

          try {
            const resumeStream = await anthropic.messages.create({
            model: SONNET,
            max_tokens: 4000,
            system: `You are an expert resume writer with 15+ years of experience helping candidates land roles at top companies. Your job is to deeply analyze the candidate's background and the job description, then produce a tailored, ATS-optimized resume that gives them the best possible chance of getting an interview.

Rules:
- Reframe and emphasize the candidate's REAL experience to match the JD
- Extract and highlight specific metrics, numbers, and outcomes from their background (e.g. "reduced resolution time by 50%")
- Mirror the exact language and keywords from the job description
- Never invent experience, companies, titles, or metrics
- If the candidate's background is a stretch for the role, make the best honest case possible
- Prioritize recent and relevant experience
- Cut or minimize experience that is irrelevant to the target role
- Write bullet points that follow the format: [Action verb] + [what you did] + [measurable outcome]
- Maximum 6 bullet points per role. For the most recent or primary role use up to 6; for older or less relevant roles use 4–5. Never exceed 6. If the candidate has more accomplishments than fit, combine related ones into a single high-impact bullet.
- Keep each bullet point under 180 characters including spaces. If a bullet runs long, split it into two focused bullets rather than letting it wrap to a third line.
- Never repeat the same action verb more than once within a single role's bullet list. Scan all bullets for that role before writing — maintain a mental list of verbs already used. Vary openers: Built → Engineered, Developed, Created, Designed, Shipped, Delivered, Launched, Implemented, Deployed, Authored; Led → Managed, Directed, Oversaw, Guided, Mentored, Headed; Improved → Reduced, Increased, Accelerated, Optimized, Streamlined, Elevated, Boosted
- Never use hedging or diminishing language on leadership experience. Words like "Informally", "Somewhat", "Partially", "Helped with", "Assisted in leading" undermine the candidate. If they led, they led. Reframe confidently: "Informally led a team" → "Managed a team of 2 engineers"; "Helped lead" → "Co-led" or just "Led"

Output the resume in EXACTLY this format:

NAME: [Full Name]
EMAIL: [email]
PHONE: [phone]
LOCATION: [city, state]
LINKEDIN: [linkedin url]
${includeSummary ? `
SUMMARY:
[2-3 sentence professional summary tailored to the role]
` : `
(Do not include a SUMMARY section. Start directly with EXPERIENCE after the header fields.)
`}
EXPERIENCE:
[Company Name] | [City, State]
[Job Title] | [Start Month Year] – [End Month Year or Present]
• [bullet point]
• [bullet point]
• [bullet point]

For multiple roles at the same company, list the company name once and add each role underneath:
[Next Job Title] | [Start Month Year] – [End Month Year]
• [bullet point]

[Next Company] | [City, State]
[Job Title] | [Dates]
• [bullet point]

SKILLS:
[Category]: [skill1], [skill2], [skill3]
[Category]: [skill1], [skill2]

EDUCATION:
[Institution] | [City, State]
[Degree]

Output the resume in EXACTLY this format. Do NOT put dates on the company line — dates belong on the job title line only. Use • for bullet points. Separate each company block with a blank line. Do not add any other sections or formatting. Do not use markdown.`,
            messages: [
              {
                role: 'user',
                content: `Company: ${company}\nJob Title: ${jobTitle}\nJob Description: ${jobDescription}\n\n${isFromUploadedFile ? 'The following background was extracted from the candidate\'s existing resume. Use it as the source of truth for their experience, but reframe and tailor it specifically for the target role.\n\n' : ''}My Background:\n${backgroundExperience}${buildContextBlock(additionalContext)}\n\nPlease create a tailored resume.`
              }
            ],
            stream: true
            });
            console.log('[generate-documents] Resume stream created successfully');

            for await (const chunk of resumeStream) {
              if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                const text = chunk.delta.text;
                resumeText += text;
                sendEvent('resume_chunk', { content: text });
              }
            }
            console.log('[generate-documents] Resume generation completed, length:', resumeText.length);

          } catch (resumeError) {
            console.error('[generate-documents] Resume generation failed:', resumeError);
            console.error('[generate-documents] Resume error message:', 
              resumeError instanceof Error ? resumeError.message : String(resumeError));
            console.error('[generate-documents] Resume error stack:', 
              resumeError instanceof Error ? resumeError.stack : 'no stack');
            sendEvent('error', { 
              message: `Resume generation failed: ${resumeError instanceof Error ? resumeError.message : 'Unknown error'}` 
            });
            return;
          }

          sendEvent('resume_done');

          // Phase 2: Generate cover letter (optional)
          if (includeCoverLetter) {
            sendEvent('status', { message: 'Writing cover letter...' });
            console.log('[generate-documents] Starting cover letter generation');

            try {
              const coverLetterStream = await anthropic.messages.create({
                model: SONNET,
                max_tokens: 2000,
                system: `You are an expert cover letter writer. Write a professional 3-4 paragraph cover letter tailored to the role. Never invent experience. Use the generated resume content as context.`,
                messages: [
                  {
                    role: 'user',
                    content: `Company: ${company}\nJob Title: ${jobTitle}\nJob Description: ${jobDescription}\n\nResume Content:\n${resumeText}\n\nPlease create a tailored cover letter.`
                  }
                ],
                stream: true
              });
              console.log('[generate-documents] Cover letter stream created successfully');

              for await (const chunk of coverLetterStream) {
                if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
                  const text = chunk.delta.text;
                  coverLetterText += text;
                  sendEvent('cover_letter_chunk', { content: text });
                }
              }
              console.log('[generate-documents] Cover letter generation completed, length:', coverLetterText.length);

            } catch (coverLetterError) {
              console.error('[generate-documents] Cover letter generation failed:', coverLetterError);
              sendEvent('error', {
                message: `Cover letter generation failed: ${coverLetterError instanceof Error ? coverLetterError.message : 'Unknown error'}`
              });
              return;
            }

            sendEvent('cover_letter_done');
          }

          // Phase 3: Answer application questions (optional)
          const filteredQuestions = (questions as string[]).filter((q: string) => q.trim().length > 0);
          let questionAnswers: { question: string; answer: string }[] = [];

          if (filteredQuestions.length > 0) {
            sendEvent('status', { message: 'Answering application questions...' });
            console.log('[generate-documents] Starting questions generation, count:', filteredQuestions.length);

            try {
              const questionsPrompt = filteredQuestions.map((q: string, i: number) => `Question ${i + 1}: ${q}`).join('\n\n');
              const questionsResponse = await anthropic.messages.create({
                model: SONNET,
                max_tokens: 2000,
                system: `You are an expert career coach helping a job applicant write their own application answers. Write every answer in FIRST PERSON ("I", "my", "me") — the applicant is speaking directly. Never refer to the candidate in third person by name or pronoun. Use ONLY the candidate's real experience from their background and any provided context documents. Never invent experience, companies, titles, or metrics.

Rules for answers:
- ${shortResponse ? 'SHORT RESPONSE MODE: Keep each answer to 2–3 sentences maximum, no more than 5.' : 'Keep each answer to 2–3 concise paragraphs maximum.'}
- Always write in first person — use "I", "my", "me", never "she", "he", "they", or the candidate's name
- Use specific examples and metrics where available
- Match the tone to the role (technical roles = technical depth, leadership roles = impact and people focus)
- Start each answer with the strongest most relevant point; vary openings (avoid starting every sentence with "I")
- Reference the specific company name where appropriate

Output valid JSON only, no markdown fences:
{"answers": [{"question": "original question text", "answer": "your generated answer"}]}`,
                messages: [
                  {
                    role: 'user',
                    content: `Company: ${company}\nJob Title: ${jobTitle}\nJob Description: ${jobDescription}\n\nMy Background:\n${backgroundExperience}${buildContextBlock(additionalContext)}\n\nGenerated Resume:\n${resumeText}\n\nPlease answer these application questions:\n\n${questionsPrompt}`,
                  },
                ],
              });

              const questionsText = questionsResponse.content[0].type === 'text' ? questionsResponse.content[0].text : '{}';
              try {
                const parsed = parseStageJSON<{ answers: { question: string; answer: string }[] }>(questionsText);
                questionAnswers = parsed.answers ?? [];
                console.log('[generate-documents] Questions answered:', questionAnswers.length);
              } catch (parseErr) {
                console.error('[generate-documents] Questions JSON parse failed:', parseErr);
              }

              sendEvent('questions_done', { answers: questionAnswers });
            } catch (questionsError) {
              console.error('[generate-documents] Questions generation failed:', questionsError);
              // Non-fatal: continue to save without answers
              sendEvent('questions_done', { answers: [] });
            }
          }

          // Save to Supabase
          console.log('[generate-documents] Starting Supabase save operation');
          const supabase = supabaseServer();
          const { data: application, error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              job_title: jobTitle,
              company,
              job_description: jobDescription,
              job_url: jobUrl || null,
              resume_content: resumeText,
              cover_letter_content: coverLetterText,
              fit_analysis: fitAnalysis as any,
              questions: filteredQuestions.length > 0 ? filteredQuestions as any : null,
              question_answers: questionAnswers.length > 0 ? questionAnswers as any : null,
              status: 'applied',
            })
            .select('id')
            .single();

          if (error || !application) {
            console.error('[generate-documents] Supabase save failed:', error);
            sendEvent('error', { 
              message: `Failed to save application: ${error?.message || 'Unknown database error'}` 
            });
            return;
          }

          console.log('[generate-documents] Successfully saved application with ID:', application.id);

          // Send final result with application ID
          sendEvent('done', { 
            resumeText, 
            coverLetterText, 
            applicationId: application.id 
          });
          console.log('[generate-documents] All operations completed successfully');

        } catch (error) {
          console.error('[generate-documents] Fatal error:', error);
          console.error('[generate-documents] Error message:', 
            error instanceof Error ? error.message : String(error));
          console.error('[generate-documents] Error stack:', 
            error instanceof Error ? error.stack : 'no stack');
          sendEvent('error', { 
            message: error instanceof Error ? error.message : 'Failed to generate documents'
          });
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}