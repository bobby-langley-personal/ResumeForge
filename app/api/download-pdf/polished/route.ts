import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { createElement } from 'react';
import ResumePDF from '@/lib/pdf/ResumePDF';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeText, fileName } = await request.json() as { resumeText: string; fileName?: string };
    if (!resumeText) return NextResponse.json({ error: 'resumeText is required' }, { status: 400 });

    const user = await currentUser();
    const fullName = user?.fullName || user?.firstName || 'User';

    const element = createElement(ResumePDF, {
      resumeText,
      candidateName: fullName,
      company: '',
      jobTitle: '',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfBuffer = await renderToBuffer(element as React.ReactElement<any>);

    const safeName = (fileName || 'Polished_Resume').replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${safeName}.pdf"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    });
  } catch (error) {
    console.error('[download-pdf/polished]', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
