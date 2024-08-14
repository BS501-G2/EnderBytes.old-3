import { goto } from '$app/navigation';
import { getConnection } from '$lib/client/client';

export async function load(): Promise<void> {
  const {
    serverFunctions: { getServerStatus, whoAmI }
  } = getConnection();

  const status = await getServerStatus();
  if (status.setupRequired) {
    await goto('/setup', { replaceState: true });
    return;
  }

  const authentication = await whoAmI();

  console.log(authentication);

  if (authentication == null) {
    await goto('/login', { replaceState: true });
    return;
  }
}
