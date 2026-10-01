import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';
import ResumePDF from '@/lib/pdf/ResumePDF';
import { renderWithAutoCompact } from '@/lib/pdf/render-with-autocompact';
import { withApiLogging } from '@/lib/with-api-logging';

export const runtime = 'nodejs';

export const POST = withApiLogging('/api/download-pdf/polished', async (request: NextRequest) => {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { resumeText, fileName } = await request.json() as { resumeText: string; fileName?: string };
    if (!resumeText) return NextResponse.json({ error: 'resumeText is required' }, { status: 400 });

    const supabase = supabaseServer();
    const [user, profileResult] = await Promise.all([
      currentUser(),
      supabase.from('user_profiles').select('full_name').eq('user_id', userId).single(),
    ]);
    const fullName = profileResult.data?.full_name || user?.fullName || user?.firstName || 'User';

    const pdfBuffer = await renderWithAutoCompact(ResumePDF, {
      resumeText,
      candidateName: fullName,
      company: '',
      jobTitle: '',
    }, 2);

    const safeName = (fileName || 'Polished_Resume').replace(/[^a-zA-Z0-9_-]/g, '_');

    return new NextResponse(new Uint8Array(pdfBuffer as Buffer), {
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
});
