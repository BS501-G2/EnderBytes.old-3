import { goto } from '$app/navigation';
import { getConnection } from '@rizzzi/enderdrive-lib/client';

export async function load() {
  const {
    funcs: { getServerStatus }
  } = getConnection();

  const status = await getServerStatus();

  if (!status.setupRequired) {
    return await goto('/', { replaceState: true });
  }
}
