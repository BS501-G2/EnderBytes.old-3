import { goto } from '$app/navigation';
import { getConnection } from '$lib/client/client';
import { UserRole } from '@rizzzi/enderdrive-lib/shared';

export async function load(): Promise<void> {
  const {
    serverFunctions: { whoAmI }
  } = getConnection();
  const user = await whoAmI();

  if (user == null) {
    await goto('/login', { replaceState: true });
    return;
  }

  if (user.role < UserRole.SiteAdmin) {
    await goto('/app', { replaceState: true });
    return;
  }
}
