import { goto } from '$app/navigation';
import { getAndValidateAuthentication, getConnection } from '$lib/client/client';

export async function load(): Promise<void> {
  const {
    serverFunctions: { getServerStatus, whoAmI }
  } = getConnection();

  const serverStatus = await getServerStatus();

  if (serverStatus.setupRequired) {
    return await goto('/setup', { replaceState: true });
  }

  const { searchParams } = new URL(window.location.href);

  const authentication = await whoAmI();

  if (authentication != null) {
    return await goto(searchParams.get('return') ?? '/app', { replaceState: true });
  }
}
