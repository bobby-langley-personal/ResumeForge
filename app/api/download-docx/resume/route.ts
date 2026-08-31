import { NextRequest, NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { supabaseServer } from '@/lib/supabase'
import { generateResumeDocx } from '@/lib/docx/ResumeDocx'
import { withApiLogging } from '@/lib/with-api-logging'

export const runtime = 'nodejs'

export const POST = withApiLogging('/api/download-docx/resume', async (request: NextRequest) => {
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { applicationId } = await request.json()
    if (!applicationId) {
      return NextResponse.json({ error: 'applicationId is required' }, { status: 400 })
    }

    const supabase = supabaseServer()

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

    if (!application.resume_content) {
      return NextResponse.json({ error: 'No resume content found' }, { status: 404 })
    }

    const [user, profileResult] = await Promise.all([
      currentUser(),
      supabase.from('user_profiles').select('full_name').eq('user_id', userId).single(),
    ])
    const fullName = profileResult.data?.full_name || user?.fullName || user?.firstName || 'User'

    const buffer = await generateResumeDocx(application.resume_content, fullName)

    const slugify = (s: string) =>
      s.replace(/\bat\b/gi, '').replace(/[^a-zA-Z0-9]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
    const filename = `Resume_${slugify(application.company)}_${slugify(application.job_title)}.docx`

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition',
      },
    })
  } catch (error) {
    console.error('DOCX generation error:', error)
    return NextResponse.json({ error: 'Failed to generate DOCX' }, { status: 500 })
  }
})
