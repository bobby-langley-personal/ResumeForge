import { auth } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const { userId } = await auth();
  try {
    const body = await req.json();
    console.log('[analytics]', JSON.stringify({ userId, ...body, ts: new Date().toISOString() }));
  } catch {
    // ignore
  }
  return NextResponse.json({ ok: true });
}
