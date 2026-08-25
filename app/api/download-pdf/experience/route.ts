export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import { supabaseServer } from '@/lib/supabase';
import ResumePDF from '@/lib/pdf/ResumePDF';
import DocumentPDF from '@/lib/pdf/DocumentPDF';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeId } = await request.json() as { resumeId: string };
    if (!resumeId) return NextResponse.json({ error: 'resumeId is required' }, { status: 400 });

    const supabase = supabaseServer();
    const [itemResult, user, profileResult] = await Promise.all([
      supabase
        .from('resumes')
        .select('id, title, item_type, content')
        .eq('id', resumeId)
        .eq('user_id', userId)
        .single(),
      currentUser(),
      supabase.from('user_profiles').select('full_name').eq('user_id', userId).maybeSingle(),
    ]);

    if (!itemResult.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const item = itemResult.data;
    const resumeText = (item.content as { text: string }).text ?? '';
    const fullName = profileResult.data?.full_name || user?.fullName || user?.firstName || 'User';
    const safeName = item.title.replace(/[^a-zA-Z0-9_\- ]/g, '_').trim() || 'document';

    // Use ResumePDF for resumes (parses sections, formats like a real resume),
    // DocumentPDF for all other types (cover letters, notes, etc.)
    const element = item.item_type === 'resume'
      ? createElement(ResumePDF, { resumeText, candidateName: fullName, company: '', jobTitle: '' })
      : createElement(DocumentPDF, { text: resumeText, title: item.title });
    const pdfBuffer = await renderToBuffer(element as React.ReactElement);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (error) {
    console.error('[download-pdf/experience]', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
