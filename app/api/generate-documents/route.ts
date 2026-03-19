export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

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
    const { company, jobTitle, jobDescription, backgroundExperience } = await req.json();
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

          // Phase 1: Generate resume
          sendEvent('status', { message: 'Analyzing job description...' });
          console.log('[generate-documents] Starting resume generation');

          try {
            const resumeStream = await anthropic.messages.create({
            model: MODELS.SONNET,
            max_tokens: 4000,
            system: `You are an expert resume writer. Reframe and emphasize the user's experience to match the job description. Never invent experience. Output clean plain text resume in standard sections: Summary, Experience, Skills, Education.`,
            messages: [
              {
                role: 'user',
                content: `Company: ${company}\nJob Title: ${jobTitle}\nJob Description: ${jobDescription}\n\nMy Background:\n${backgroundExperience}\n\nPlease create a tailored resume.`
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

          // Phase 2: Generate cover letter
          sendEvent('status', { message: 'Writing cover letter...' });
          console.log('[generate-documents] Starting cover letter generation');

          try {
            const coverLetterStream = await anthropic.messages.create({
            model: MODELS.SONNET,
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
            console.error('[generate-documents] Cover letter error message:', 
              coverLetterError instanceof Error ? coverLetterError.message : String(coverLetterError));
            console.error('[generate-documents] Cover letter error stack:', 
              coverLetterError instanceof Error ? coverLetterError.stack : 'no stack');
            sendEvent('error', { 
              message: `Cover letter generation failed: ${coverLetterError instanceof Error ? coverLetterError.message : 'Unknown error'}` 
            });
            return;
          }

          // Save to Supabase
          console.log('[generate-documents] Starting Supabase save operation');
          const supabase = await supabaseServer();
          const { data: application, error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              job_title: jobTitle,
              company,
              job_description: jobDescription,
              resume_content: resumeText,
              cover_letter_content: coverLetterText,
              status: 'applied',
              application_date: new Date().toISOString(),
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