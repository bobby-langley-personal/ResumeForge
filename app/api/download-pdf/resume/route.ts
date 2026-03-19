export const runtime = 'nodejs';

import { auth } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';
import { supabaseServer } from '@/lib/supabase';
import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import ResumePDF from '@/lib/pdf/ResumePDF';

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

    // Check if resume content exists
    if (!application.resume_content) {
      return new Response('Resume content not found', { status: 404 });
    }

    // Get user name from Clerk (fallback approach)
    const candidateName = 'Resume';

    // Generate PDF using ResumePDF component
    const pdfElement = React.createElement(ResumePDF, {
      resumeText: application.resume_content,
      candidateName: candidateName,
      company: application.company,
      jobTitle: application.job_title,
    });

    const pdfBuffer = await renderToBuffer(pdfElement as React.ReactElement<any>);

    // Create filename with proper format: LastName_Resume_Company_Role.pdf
    const safeCompany = application.company.replace(/[^a-zA-Z0-9]/g, '_');
    const safeRole = application.job_title.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `Resume_${safeCompany}_${safeRole}.pdf`;

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