export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { withApiLogging } from '@/lib/with-api-logging';

const path = require('path');
const mammoth = require('mammoth');

// Lazy-init pdfjs-dist v3 (CommonJS build). We use path.join(process.cwd(), ...)
// for the worker path instead of require.resolve() — webpack intercepts
// require.resolve and returns a module ID (not a file path) even when the
// package is marked external, which breaks pdfjs's workerSrc validation.
let _pdfjs: typeof import('pdfjs-dist') | null = null;
function getPdfjs() {
  if (!_pdfjs) {
    _pdfjs = require('pdfjs-dist/legacy/build/pdf.js');
    _pdfjs!.GlobalWorkerOptions.workerSrc = path.join(
      process.cwd(),
      'node_modules/pdfjs-dist/legacy/build/pdf.worker.js'
    );
  }
  return _pdfjs!;
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = getPdfjs();
  const data = new Uint8Array(buffer);
  // eslint-disable-next-line
  const doc = await (pdfjs.getDocument as any)({
    data,
    useWorkerFetch: false,
    useSystemFonts: true,
    stopAtErrors: false,
  }).promise;

  let text = '';
  for (let i = 1; i <= doc.numPages; i++) {
    try {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let lastY: number | null = null;
      for (const item of content.items as Array<{ str: string; transform: number[] }>) {
        if (lastY === null || lastY === item.transform[5]) {
          text += item.str;
        } else {
          text += '\n' + item.str;
        }
        lastY = item.transform[5];
      }
      text += '\n\n';
    } catch {
      // skip unreadable pages
    }
  }
  return text;
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
        extractedText = await extractPdfText(buffer);

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