import { goto } from '$app/navigation';
import { getConnection } from '$lib/client/client';
import { UserResolveType, UserRole } from '@rizzzi/enderdrive-lib/shared';

const {
  serverFunctions: { getServerStatus, getUser, whoAmI }
} = getConnection();

export async function load(): Promise<void> {
  const status = await getServerStatus();

  if (status.setupRequired) {
    await goto('/setup', { replaceState: true });
    return;
  }

  const me = await whoAmI();
  if (me == null) {
    await goto('/login', { replaceState: true });
    return;
  } else if (me.role < UserRole.SiteAdmin) {
    await goto('/app', { replaceState: true });
    return;
  }
}
