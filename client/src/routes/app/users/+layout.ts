import { goto } from '$app/navigation';
import { getConnection } from '$lib/client/client';
import { serializeUserRole } from '@rizzzi/enderdrive-lib/shared';
import type { LoadEvent } from '@sveltejs/kit';

export async function load({ url }: LoadEvent): Promise<void> {
	const {
		serverFunctions: { whoAmI }
	} = getConnection();

	if (url.searchParams.get('id') === '!me') {
		return;
	}

	const a = (await whoAmI())!;
	if (!(a.role === serializeUserRole('SiteAdmin') || a.role === serializeUserRole('SystemAdmin'))) {
		await goto('/app/users?id=!me', { replaceState: true });
	}
}
