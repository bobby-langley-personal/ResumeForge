import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';
import { extractContactFields } from '@/lib/extract-contact';
import { withApiLogging } from '@/lib/with-api-logging';

export const runtime = 'nodejs';

export const POST = withApiLogging('/api/extract-contact', async (req: NextRequest) => {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { text } = await req.json() as { text: string };
  if (!text) return NextResponse.json({ full_name: '', email: '', location: '', linkedin_url: '' });

  const fields = await extractContactFields(text);
  return NextResponse.json(fields);
});
