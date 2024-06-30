import { goto } from '$app/navigation';
import { getAndValidateAuthentication, getAuthentication } from '$lib/client/auth';
import { getConnection } from '@rizzzi/enderdrive-lib/client';
import { UserResolveType, UserRole } from '@rizzzi/enderdrive-lib/shared';

const {
  funcs: { getServerStatus, getUser }
} = getConnection();

export async function load(): Promise<void> {
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

  const user = (await getUser(getAuthentication(), [
    UserResolveType.UserId,
    authentication.userId
  ]))!;
  if (user.role < UserRole.SiteAdmin) {
    await goto('/', { replaceState: true });
    return;
  }
}
