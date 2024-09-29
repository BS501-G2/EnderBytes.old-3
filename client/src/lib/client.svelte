<script lang="ts" module>
</script>

<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

{@render children()}

<style lang="scss">
</style>
