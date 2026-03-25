import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET() {
  const { userId } = await auth();
  if (!userId) return new Response('Unauthorized', { status: 401 });

  const user = await currentUser();
  return Response.json({
    id: userId,
    name: user?.fullName ?? user?.firstName ?? '',
    email: user?.emailAddresses[0]?.emailAddress ?? '',
    imageUrl: user?.imageUrl ?? null,
  });
}
