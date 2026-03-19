export const runtime = 'edge';

import { auth } from '@clerk/nextjs';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { MODELS } from '@/lib/models';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GenerateRequest {
  company: string;
  jobTitle: string;
  jobDescription: string;
  backgroundExperience: string;
}

export async function POST(request: Request) {
  try {
    // Verify authentication
    const { userId } = auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse and validate request body
    const body: GenerateRequest = await request.json();
    const { company, jobTitle, jobDescription, backgroundExperience } = body;

    if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // Stage 1: Generate Resume
          sendEvent({ type: 'status', message: 'Analyzing job description...' });
          
          const resumeMessages: Anthropic.Messages.MessageParam[] = [
            {
              role: 'user',
              content: `Job Description:\n${jobDescription}\n\nBackground Experience:\n${backgroundExperience}\n\nCompany: ${company}\nJob Title: ${jobTitle}`
            }
          ];

          let resumeText = '';
          
          const resumeStream = await anthropic.messages.create({
            model: MODELS.SONNET,
            max_tokens: 4000,
            system: 'You are an expert resume writer. Reframe and emphasize the user\'s experience to match the job description. Never invent experience. Output clean plain text resume in standard sections: Summary, Experience, Skills, Education.',
            messages: resumeMessages,
            stream: true
          });

          for await (const chunk of resumeStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              resumeText += text;
              sendEvent({ type: 'resume_chunk', content: text });
            }
          }

          sendEvent({ type: 'resume_done' });

          // Stage 2: Generate Cover Letter  
          sendEvent({ type: 'status', message: 'Writing cover letter...' });

          const coverLetterMessages: Anthropic.Messages.MessageParam[] = [
            {
              role: 'user', 
              content: `Job Description:\n${jobDescription}\n\nGenerated Resume:\n${resumeText}\n\nCompany: ${company}\nJob Title: ${jobTitle}`
            }
          ];

          let coverLetterText = '';

          const coverLetterStream = await anthropic.messages.create({
            model: MODELS.SONNET,
            max_tokens: 2000,
            system: 'You are an expert cover letter writer. Write a professional 3-4 paragraph cover letter tailored to the role. Never invent experience. Use the generated resume content as context.',
            messages: coverLetterMessages,
            stream: true
          });

          for await (const chunk of coverLetterStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              coverLetterText += text;
              sendEvent({ type: 'cover_letter_chunk', content: text });
            }
          }

          // Save to Supabase
          const { error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              job_title: jobTitle,
              company: company,
              job_description: jobDescription,
              status: 'applied' as const
            });

          if (error) {
            console.error('Error saving application:', error);
          }

          // Send final event
          sendEvent({
            type: 'done',
            resumeText: resumeText,
            coverLetterText: coverLetterText
          });

        } catch (error) {
          console.error('Generation error:', error);
          sendEvent({ type: 'error', message: 'Failed to generate documents' });
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