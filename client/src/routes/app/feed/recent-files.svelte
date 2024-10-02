<script lang="ts">
	import { getConnection } from '$lib/client/client';

	const {
		serverFunctions: { listFileLogs }
	} = getConnection();
</script>

