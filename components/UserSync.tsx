import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServer } from '@/lib/supabase';

/**
 * Rendered inside the root layout for every authenticated page load.
 * Ensures the users table row exists before any API call can run.
 *
 * In prod: Clerk webhooks create the row on sign-up, so this is a fast
 * no-op (ON CONFLICT DO NOTHING = index lookup only, ~1ms).
 * In dev: webhooks don't reach localhost, so this is the only reliable
 * place to guarantee the row exists without patching every API route.
 */
export default async function UserSync() {
  const { userId } = await auth();
  if (!userId) return null;

  const user = await currentUser();
  const email = user?.emailAddresses[0]?.emailAddress;
  if (!email) return null;

  const supabase = supabaseServer();
  await supabase
    .from('users')
    .upsert({ id: userId, email }, { onConflict: 'id', ignoreDuplicates: true });

  return null;
}
