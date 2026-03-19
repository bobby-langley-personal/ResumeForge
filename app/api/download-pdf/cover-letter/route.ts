export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
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

    // Get application from Supabase
    const supabase = await supabaseServer();
    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (error) {
      console.error('Error fetching application:', error);
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

    // Get user name from Clerk (fallback approach)
    const candidateName = 'User';

    // Generate PDF using CoverLetterPDF component
    const pdfElement = React.createElement(CoverLetterPDF, {
      coverLetterText: application.cover_letter_content,
      candidateName: candidateName,
      company: application.company,
      jobTitle: application.job_title,
    });

    const pdfBuffer = await renderToBuffer(pdfElement);

    // Create filename with proper format: LastName_CoverLetter_Company_Role.pdf
    const safeCompany = application.company.replace(/[^a-zA-Z0-9]/g, '_');
    const safeRole = application.job_title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `CoverLetter_${safeCompany}_${safeRole}.pdf`;

    // Return PDF as download
    return new Response(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}