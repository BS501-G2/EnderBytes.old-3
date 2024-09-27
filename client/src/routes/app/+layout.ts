import { goto } from '$app/navigation';
import { getConnection2 } from '$lib/client/client';

export async function load(): Promise<void> {
  const {
    serverFunctions: { getServerStatus, whoAmI }
  } = getConnection2();

  const status = await getServerStatus();

  if (status.setupRequired) {
    await goto('/setup', { replaceState: true });
    return;
  }

  const me = await whoAmI();

  if (me == null) {
    await goto('/login', { replaceState: true });
    return;
  }
}
