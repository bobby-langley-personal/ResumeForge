import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createElement } from 'react'
import { supabaseServer } from '@/lib/supabase'
import CoverLetterPDF from '@/lib/pdf/CoverLetterPDF'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { applicationId } = await request.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    const supabase = await supabaseServer()

    const { data: application, error } = await supabase
      .from('applications')
      .select('*')
      .eq('id', applicationId)
      .single()

    if (error || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (!application.cover_letter_content) {
      return NextResponse.json({ error: 'No cover letter content found' }, { status: 404 })
    }

    const user = await currentUser()
    const fullName = user?.fullName || user?.firstName || 'User'
    const lastName = user?.lastName || fullName.split(' ').pop() || 'User'

    const props = {
      coverLetterText: application.cover_letter_content,
      candidateName: fullName,
      company: application.company,
      jobTitle: application.job_title,
    }

    const element = createElement(CoverLetterPDF, props)
    const pdfBuffer = await renderToBuffer(element as React.ReactElement<any>)

    const companyName = application.company.replace(/\s+/g, '_')
    const role = application.job_title.replace(/\s+/g, '_')
    const filename = `${lastName}_CoverLetter_${companyName}_${role}.pdf`

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('PDF generation error:', error)
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 })
  }
}