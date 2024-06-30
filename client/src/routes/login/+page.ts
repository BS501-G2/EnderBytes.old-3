import { goto } from '$app/navigation';
import { getAndValidateAuthentication } from '$lib/client/auth';
import { getConnection } from '@rizzzi/enderdrive-lib/client';

export async function load(): Promise<void> {
  const {
    funcs: { getServerStatus }
  } = getConnection();

  const serverStatus = await getServerStatus();

  if (serverStatus.setupRequired) {
    return await goto('/setup', { replaceState: true });
  }

  const { searchParams } = new URL(window.location.href);

  const authentication = await getAndValidateAuthentication();

  if (authentication != null) {
    return await goto(searchParams.get('return') ?? '/app', { replaceState: true });
  }
}
