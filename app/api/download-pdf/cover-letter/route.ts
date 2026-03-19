import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import { renderToBuffer } from '@react-pdf/renderer';
import React from 'react';
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF';

// Use nodejs runtime for @react-pdf/renderer compatibility
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const { applicationId } = await request.json();
    if (!applicationId) {
      return NextResponse.json({ error: 'Application ID is required' }, { status: 400 });
    }

    // Create Supabase client
    const supabase = createClient();

    // Fetch application from database
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }

    // Verify application belongs to current user
    if (application.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check if cover letter content exists
    if (!application.cover_letter_content) {
      return NextResponse.json({ error: 'Cover letter content not found' }, { status: 404 });
    }

    // Get user's last name from Clerk for filename
    // For now, extract from content or use default
    const candidateName = 'User'; // This could be improved by fetching from Clerk
    const lastName = candidateName.split(' ').pop() || 'User';
    
    // Format filename: LastName_CoverLetter_Company_Role.pdf
    const company = application.company.replace(/\s+/g, '');
    const role = application.job_title.replace(/\s+/g, '');
    const filename = `${lastName}_CoverLetter_${company}_${role}.pdf`;

    // Generate PDF using React.createElement to avoid JSX syntax issues
    const pdfElement = React.createElement(CoverLetterPDF, {
      coverLetterText: application.cover_letter_content,
      candidateName: candidateName,
      company: application.company,
      jobTitle: application.job_title,
    });

    const pdfBuffer = await renderToBuffer(pdfElement);

    // Return PDF as downloadable file
    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error generating cover letter PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}