<script lang="ts">
	import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
	import { scale } from 'svelte/transition';

	const { fileId }: { fileId: number } = $props();

	let embed: HTMLEmbedElement = $state(null as never);
</script>

<embed
	bind:this={embed}
	class="file-view"
	class:mobile={$viewMode & ViewMode.Mobile}
	in:scale|global={{ duration: 200, start: 0.95 }}
	src="/embed/file-view?fileId={fileId}"
	type="text/html"
/>

<style lang="scss">
	embed.file-view {
		flex-grow: 1;

		margin: 8px;

		border-radius: 8px;

		background-color: #4f4f4f;
		color: #ffffff;
	}

	embed.file-view.mobile {
		border-radius: unset;
		z-index: 1;

		margin: 0;

		position: fixed;
		left: 0;
		top: 0;

		min-width: 100dvw;
		min-height: 100dvh;
		max-width: 100dvw;
		max-height: 100dvh;
	}
</style>
