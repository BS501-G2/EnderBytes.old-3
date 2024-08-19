import { goto } from '$app/navigation';
import { getAndValidateAuthentication, getConnection } from '$lib/client/client';

export async function load(): Promise<void> {
  const {
    serverFunctions: { getServerStatus, whoAmI }
  } = getConnection();

  const serverStatus = await getServerStatus();

  if (serverStatus.setupRequired) {
    await goto('/setup', { replaceState: true });
    return
  }

  const { searchParams } = new URL(window.location.href);

  const authentication = await whoAmI();

  if (authentication != null) {
    await goto(searchParams.get('return') ?? '/app', { replaceState: true });
    return
  }
}
