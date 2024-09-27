import { goto } from '$app/navigation';
import { getConnection2 } from '$lib/client/client';

export async function load() {
  const {
    serverFunctions: { getServerStatus }
  } = getConnection2();

  const status = await getServerStatus();

  if (!status.setupRequired) {
    return await goto('/', { replaceState: true });
  }
}
