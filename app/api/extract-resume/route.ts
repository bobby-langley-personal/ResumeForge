export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { withApiLogging } from '@/lib/with-api-logging';

const pdfParse = require('pdf-parse/lib/pdf-parse');
const mammoth = require('mammoth');

// Fallback PDF extractor using pdf2json (independent parser, no worker needed).
// Used when pdf-parse fails — pdf-parse bundles pdfjs v1.10 (2017) which
// can't recover from non-standard XRef tables that modern PDF generators produce.
function extractWithPdf2json(buffer: Buffer): Promise<string> {
  const PDFParser = require('pdf2json');
  return new Promise((resolve, reject) => {
    const parser = new PDFParser();
    parser.on('pdfParser_dataError', reject);
    parser.on('pdfParser_dataReady', (data: any) => {
      const text = (data.Pages ?? [])
        .map((page: any) =>
          (page.Texts ?? [])
            .map((t: any) => {
              try { return decodeURIComponent(t.R.map((r: any) => r.T).join('')); }
              catch { return t.R.map((r: any) => r.T).join(''); }
            })
            .join(' ')
        )
        .join('\n');
      resolve(text);
    });
    parser.parseBuffer(buffer);
  });
}

export const POST = withApiLogging('/api/extract-resume', async (req: NextRequest) => {
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
        try {
          const data = await pdfParse(buffer);
          extractedText = data.text;
        } catch {
          // pdf-parse (pdfjs v1.10) failed — try pdf2json as fallback
          console.log('[extract-resume] pdf-parse failed, trying pdf2json fallback');
          extractedText = await extractWithPdf2json(buffer);
        }

      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
                 file.name.toLowerCase().endsWith('.docx')) {
        const result = await mammoth.extractRawText({ buffer });
        extractedText = result.value;
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
      const msg = extractError instanceof Error ? extractError.message : String(extractError);
      console.error('[extract-resume] Text extraction failed:', extractError);
      // Surface error in admin logs via withApiLogging by throwing
      throw new Error(`PDF extraction failed: ${msg}`);
    }

  } catch (error) {
    // Re-throw so withApiLogging captures it in api_logs
    throw error;
  }
});