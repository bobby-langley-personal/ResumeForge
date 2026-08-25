import { auth, currentUser } from '@clerk/nextjs/server';
import { withApiLogging } from '@/lib/with-api-logging';

export const GET = withApiLogging('/api/me', async () => {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await currentUser();
  return Response.json({
    id: userId,
    name: user?.fullName ?? user?.firstName ?? '',
    email: user?.emailAddresses[0]?.emailAddress ?? '',
    imageUrl: user?.imageUrl ?? null,
  });
});
