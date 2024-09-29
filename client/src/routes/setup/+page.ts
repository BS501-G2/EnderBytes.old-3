import { goto } from '$app/navigation';
import { getConnection } from '$lib/client/client';

export async function load() {
  const {
    serverFunctions: { getServerStatus }
  } = getConnection();

  const status = await getServerStatus();

  if (!status.setupRequired) {
    return await goto('/', { replaceState: true });
  }
}
