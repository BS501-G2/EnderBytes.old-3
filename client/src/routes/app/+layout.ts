import { goto } from '$app/navigation';
import { getAndValidateAuthentication } from '$lib/client/auth';
import { getConnection } from '@rizzzi/enderdrive-lib/client';

export async function load(): Promise<void> {
  const { funcs: { getServerStatus } } = getConnection()

  const status = await getServerStatus();

  if (status.setupRequired) {
    await goto('/setup', { replaceState: true });
    return;
  }

  const authentication = await getAndValidateAuthentication();

  if (authentication == null) {
    await goto('/login', { replaceState: true });
    return;
  }
}
