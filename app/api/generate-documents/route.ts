export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { Anthropic } from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  try {
    // Verify user is signed in
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { company, jobTitle, jobDescription, backgroundExperience } = await req.json();
    
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

          for await (const chunk of resumeStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              resumeText += text;
              sendEvent('resume_chunk', { content: text });
            }
          }

          sendEvent('resume_done');

          // Phase 2: Generate cover letter
          sendEvent('status', { message: 'Writing cover letter...' });

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

          for await (const chunk of coverLetterStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              coverLetterText += text;
              sendEvent('cover_letter_chunk', { content: text });
            }
          }

          // Save to Supabase
          const supabase = await supabaseServer();
          const { error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              job_title: jobTitle,
              company,
              job_description: jobDescription,
              status: 'applied',
              application_date: new Date().toISOString(),
            });

          if (error) {
            console.error('Error saving application:', error);
            // Don't fail the entire request for storage issues
          }

          // Send final result
          sendEvent('done', { resumeText, coverLetterText });

        } catch (error) {
          console.error('Generation error:', error);
          sendEvent('error', { message: 'Failed to generate documents' });
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