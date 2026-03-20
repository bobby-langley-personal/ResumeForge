export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

// Note: These packages need to be installed
// npm install pdf-parse mammoth @types/pdf-parse
// const pdf = require('pdf-parse');
// const mammoth = require('mammoth');

export async function POST(req: NextRequest) {
  console.log('[extract-resume] Request received');
  
  try {
    // Verify user is signed in
    const { userId } = await auth();
    if (!userId) {
      console.log('[extract-resume] Unauthorized request - no userId');
      return new Response('Unauthorized', { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return new Response('No file provided', { status: 400 });
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB in bytes
    if (file.size > maxSize) {
      return new Response('File size exceeds 5MB limit', { status: 400 });
    }

    // Check file type
    const allowedTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.docx'];
    
    const isValidType = allowedTypes.includes(file.type);
    const isValidExtension = allowedExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType && !isValidExtension) {
      return new Response('Unsupported file type. Please upload a PDF or DOCX file.', { status: 400 });
    }

    let extractedText = '';

    try {
      const buffer = Buffer.from(await file.arrayBuffer());

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        // TODO: Install pdf-parse package
        // const data = await pdf(buffer);
        // extractedText = data.text;
        
        // Temporary placeholder - replace with actual PDF parsing
        extractedText = 'PDF parsing requires pdf-parse package to be installed. Please run: npm install pdf-parse';
        
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
                 file.name.toLowerCase().endsWith('.docx')) {
        // TODO: Install mammoth package  
        // const result = await mammoth.extractRawText({ buffer });
        // extractedText = result.value;
        
        // Temporary placeholder - replace with actual DOCX parsing
        extractedText = 'DOCX parsing requires mammoth package to be installed. Please run: npm install mammoth';
      }

      if (!extractedText.trim()) {
        return new Response('Could not extract text from the file', { status: 400 });
      }

      console.log('[extract-resume] Successfully extracted text, length:', extractedText.length);

      return Response.json({ 
        text: extractedText.trim(),
        fileName: file.name,
        fileSize: file.size 
      });

    } catch (extractError) {
      console.error('[extract-resume] Text extraction failed:', extractError);
      return new Response('Failed to extract text from file', { status: 500 });
    }

  } catch (error) {
    console.error('[extract-resume] API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}