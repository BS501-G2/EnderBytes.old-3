import { goto } from '$app/navigation';
import { getConnection2 } from '$lib/client/client';
import { serializeUserRole } from '@rizzzi/enderdrive-lib/shared';

export async function load(): Promise<void> {
	const {
		serverFunctions: { whoAmI }
	} = getConnection2();
	const user = await whoAmI();

	if (user == null) {
		await goto('/login', { replaceState: true });
		return;
	}

	if (user.role < serializeUserRole('SiteAdmin')) {
		await goto('/app', { replaceState: true });
		return;
	}
}
