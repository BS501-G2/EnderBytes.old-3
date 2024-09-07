<script lang="ts">
	import type { Snippet } from 'svelte';

	const { children }: { children: Snippet } = $props();
</script>

<div class="overlay">
	{@render children()}
</div>

<style lang="scss">
	div.overlay {
		position: fixed;
		left: 0;
		top: 0;

		display: flex;
		flex-direction: column;

		justify-content: center;

		min-width: 100dvw;
		min-height: 100dvh;
		max-width: 100dvw;
		max-height: 100dvh;

		background-color: #4f4f4f;
		color: #ffffff;

		pointer-events: all;
	}
</style>
