<script lang="ts">
	import { exec } from '$lib/client/client';
</script>

{#await exec('eChO', 'test') then test}
	<p>{test}</p>
{/await}
