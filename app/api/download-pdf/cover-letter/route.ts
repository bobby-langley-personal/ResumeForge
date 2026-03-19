// Note: @react-pdf/renderer may not be compatible with edge runtime
// Using nodejs runtime as the one exception to Rule 1
export const runtime = 'nodejs';

import { auth, currentUser } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { renderToBuffer } from '@react-pdf/renderer';
import { supabaseServer } from '@/lib/supabase';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';

export async function POST(req: NextRequest) {
  try {
    // Verify user is signed in
    const { userId } = await auth();
    if (!userId) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request body
    const { applicationId } = await req.json();
    
    if (!applicationId) {
      return new Response('Missing applicationId', { status: 400 });
    }

    // Fetch application from Supabase
    const supabase = await supabaseServer();
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return new Response('Application not found', { status: 404 });
    }

    // Verify application belongs to current user
    if (application.user_id !== userId) {
      return new Response('Forbidden', { status: 403 });
    }

    // Check if cover letter content exists
    if (!application.cover_letter_content) {
      return new Response('Cover letter content not found', { status: 404 });
    }

    // Get user details for candidate name
    const user = await currentUser();
    const candidateName = user?.fullName || user?.firstName || 'Unknown';
    
    // Extract last name for filename
    const lastName = user?.lastName || candidateName.split(' ').pop() || 'CoverLetter';
    
    // Format filename components (replace spaces with underscores)
    const formattedCompany = application.company.replace(/\s+/g, '');
    const formattedRole = application.job_title.replace(/\s+/g, '');
    const filename = `${lastName}_CoverLetter_${formattedCompany}_${formattedRole}.pdf`;

    // Generate PDF using CoverLetterPDF component (JSX syntax instead of React.createElement)
    const pdfBuffer = await renderToBuffer(
      <CoverLetterPDF
        coverLetterText={application.cover_letter_content}
        candidateName={candidateName}
        company={application.company}
        jobTitle={application.job_title}
      />
    );

    // Return PDF as download (convert Buffer to Uint8Array for Response compatibility)
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}