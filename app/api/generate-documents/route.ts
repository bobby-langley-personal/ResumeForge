export const runtime = 'edge';

import { auth } from '@clerk/nextjs/server';
import Anthropic from '@anthropic-ai/sdk';
import { MODELS } from '@/lib/models';
import { supabaseServer } from '@/lib/supabase';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: Request) {
  try {
    // Verify user is signed in via Clerk
    const { userId } = await auth();
    
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const body = await req.json();
    const { company, jobTitle, jobDescription, backgroundExperience } = body;

    // Validate required fields
    if (!company || !jobTitle || !jobDescription || !backgroundExperience) {
      return new Response('Missing required fields', { status: 400 });
    }

    // Create SSE response stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        
        const sendEvent = (data: object) => {
          const eventData = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(eventData));
        };

        try {
          // Initialize variables to collect generated content
          let resumeText = '';
          let coverLetterText = '';

          // Step 1: Generate Resume
          sendEvent({ type: 'status', message: 'Analyzing job description...' });

          const resumeStream = await anthropic.messages.create({
            model: MODELS.SONNET,
            max_tokens: 2000,
            system: "You are an expert resume writer. Reframe and emphasize the user's experience to match the job description. Never invent experience. Output clean plain text resume in standard sections: Summary, Experience, Skills, Education.",
            messages: [{
              role: 'user',
              content: `Job Title: ${jobTitle}\nCompany: ${company}\n\nJob Description:\n${jobDescription}\n\nBackground Experience:\n${backgroundExperience}\n\nPlease generate a tailored resume.`
            }],
            stream: true,
          });

          for await (const chunk of resumeStream) {
            if (chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              resumeText += text;
              sendEvent({ type: 'resume_chunk', content: text });
            }
          }

          sendEvent({ type: 'resume_done' });

          // Step 2: Generate Cover Letter
          sendEvent({ type: 'status', message: 'Writing cover letter...' });

          const coverLetterStream = await anthropic.messages.create({
            model: MODELS.SONNET,
            max_tokens: 1500,
            system: "You are an expert cover letter writer. Write a professional 3-4 paragraph cover letter tailored to the role. Never invent experience. Use the generated resume content as context.",
            messages: [{
              role: 'user',
              content: `Job Title: ${jobTitle}\nCompany: ${company}\n\nJob Description:\n${jobDescription}\n\nBackground Experience:\n${backgroundExperience}\n\nGenerated Resume:\n${resumeText}\n\nPlease generate a tailored cover letter.`
            }],
            stream: true,
          });

          for await (const chunk of coverLetterStream) {
            if (chunk.delta.type === 'text_delta') {
              const text = chunk.delta.text;
              coverLetterText += text;
              sendEvent({ type: 'cover_letter_chunk', content: text });
            }
          }

          // Save application to Supabase
          const supabase = await supabaseServer();
          const { error } = await supabase
            .from('applications')
            .insert({
              user_id: userId,
              job_title: jobTitle,
              company: company,
              job_description: jobDescription,
              status: 'applied',
              application_date: new Date().toISOString(),
            });

          if (error) {
            console.error('Error saving application:', error);
            sendEvent({ type: 'error', message: 'Failed to save application' });
          }

          // Send final completion event
          sendEvent({ 
            type: 'done', 
            resumeText: resumeText.trim(),
            coverLetterText: coverLetterText.trim()
          });

        } catch (error) {
          console.error('Generation error:', error);
          sendEvent({ type: 'error', message: 'Failed to generate documents' });
        } finally {
          controller.close();
        }
      },
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
    return new Response('Internal Server Error', { status: 500 });
  }
}