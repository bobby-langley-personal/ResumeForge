import { authMiddleware } from '@clerk/nextjs/server';
import { NextRequest } from 'next/server';

export default authMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up'],
  ignoredRoutes: ['/api/webhooks/clerk']
});

export const config = {
  matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)']
};