<script lang="ts" module>
	export interface FileViewerContext {
		pushTopContent: (view: Snippet) => () => void;
		pushBottomContent: (view: Snippet) => () => void;
	}

	export const FileViewerContextName = 'fv-context';
</script>

<script lang="ts">
	import type { FileResource } from '@rizzzi/enderdrive-lib/server';

	import { onMount, setContext, type Snippet } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { fly } from 'svelte/transition';

	const {
		children,
		file,
		filePathChain,
		viruses
	}: {
		children: Snippet;
		file: FileResource;
		filePathChain: FileResource[];
		viruses: string[];
	} = $props();

	onMount(() => {
		document.body.style.backgroundColor = '#4f4f4f';
		document.body.style.color = '#ffffff';
	});

	const topContent: Writable<Snippet[]> = writable([]);
	const bottomContent: Writable<Snippet[]> = writable([]);

	const {} = setContext<FileViewerContext>(FileViewerContextName, {
		pushTopContent: (view: Snippet) => {
			topContent.update((views) => [...views, view]);

			return () => {
				topContent.update((views) => views.filter((view) => view !== view));
			};
		},

		pushBottomContent: (view: Snippet) => {
			bottomContent.update((views) => [...views, view]);

			return () => {
				bottomContent.update((views) => views.filter((view) => view !== view));
			};
		}
	});

	let timeout: NodeJS.Timeout | null = $state(null as never);
	let barsShown: boolean = $state(true);
	let embedElement: HTMLDivElement = $state(null as never);

	const barVisibilityDuration: number = 25000;

	function updateBarShown() {
		if (timeout != null) {
			clearTimeout(timeout);
		} else {
			barsShown = true;
		}

		timeout = setTimeout(() => {
			barsShown = false;

			timeout = null;
		}, barVisibilityDuration);
	}

	onMount(() => {
		embedElement.onmousemove = () => updateBarShown();

		updateBarShown();
	});
</script>

{#snippet bar(location: 'top' | 'bottom', snippet: Snippet[])}
	{#if barsShown}
		<div
			class="{location} bar"
			transition:fly={{ duration: 250, y: location === 'top' ? -16 : 16 }}
		>
			<div class="file-name"></div>

			{#each snippet as snippetEntry (snippetEntry)}
				<div class="bar-entry">
					{@render snippetEntry()}
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

{@render bar('top', $topContent)}

<div bind:this={embedElement} class="embed">
	{@render children()}
</div>

{@render bar('bottom', $bottomContent)}

<style lang="scss">
	div.embed {
		position: fixed;
		left: 0;
		top: 0;

		min-width: 100dvw;
		min-height: 100dvh;
		max-width: 100dvw;
		max-height: 100dvh;

		display: flex;
	}

	div.bar {
		z-index: 1;

		position: fixed;
		left: 0;

		min-width: 100dvw;
		max-width: 100dvw;

		box-sizing: border-box;

		display: flex;
		flex-direction: row;

		padding: 8px;
		gap: 8px;
	}

	div.bar.top {
		top: 0;
	}

	div.bar.bottom {
		bottom: 0;
	}

	div.bar-entry {
		display: flex;
		flex-direction: row;

		min-height: calc(16px + 1em);

		gap: 4px;
		border-radius: 8px;

		background-color: var(--shadow);
	}
</style>
