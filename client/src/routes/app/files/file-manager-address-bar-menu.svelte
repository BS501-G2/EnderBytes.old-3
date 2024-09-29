<script lang="ts">
	import { getConnection } from '$lib/client/client';
	import type { FileResource } from '@rizzzi/enderdrive-lib/shared';
	import { Overlay } from '@rizzzi/svelte-commons';
	import { getContext, onMount } from 'svelte';
	import { type FileManagerProps, FileManagerPropsName } from './file-manager.svelte';
	import { fly } from 'svelte/transition';

	const { onFileId } = getContext<FileManagerProps>(FileManagerPropsName);
	const {
		element,
		file,
		onDismiss
	}: {
		element: HTMLElement;
		file: FileResource;
		onDismiss: () => void;
	} = $props();

	onMount(() => {
		if (file.type !== 'folder') {
			onDismiss();
		}
	});

	const {
		serverFunctions: { scanFolder }
	} = getConnection();
</script>

<Overlay
	position={['offset', element.offsetLeft, element.offsetTop + element.offsetHeight]}
	{onDismiss}
>
	<div class="menu-conntainer" transition:fly|global={{ duration: 250, y: -16 }}>
		<div class="menu">
			{#await scanFolder(file.id) then files}
				{#each files as entry}
					<button
						class="file"
						class:active={file.id === entry.id}
						onclick={(event) => {
							if (file.id !== entry.id) {
								onFileId(event, entry.id);
							}
							onDismiss();
						}}
					>
						<div class="file-icon">
							{#if entry.type === 'file'}
								<i class="fa-solid fa-file"></i>
							{:else if entry.type === 'folder'}
								<i class="fa-solid fa-folder"></i>
							{/if}
						</div>
						<p class="file-name">
							{entry.name}
						</p>
					</button>
				{/each}
			{/await}
		</div>
	</div>
</Overlay>

<style lang="scss">
	div.menu-conntainer {
		display: flex;
		flex-direction: column;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		box-shadow: 2px 2px 8px var(--shadow);

		border-radius: 8px;

		min-height: 0;
	}

	div.menu {
		display: flex;
		flex-direction: column;

		min-height: 0px;
		overflow: hidden auto;

		margin: 8px;
		gap: 4px;

		min-width: 360px;
		max-width: 360px;
		max-height: min(100dvh - 360px, 720px);
	}

	button.file {
		display: flex;
		flex-direction: row;
		align-items: center;

		padding: 8px;
		gap: 4px;
		border-radius: 8px;

		background-color: transparent;
		color: inherit;

		border: none;

		word-wrap: break-word;

		> div.file-icon {
			min-width: 1em;
			max-width: 1em;
			min-height: 1em;
			max-height: 1em;
		}

		> p.file-name {
			text-align: start;
			overflow: hidden;

			flex-grow: 1;
		}
	}

	button.file:hover {
		background-color: var(--shadow);
	}

	button.file:active,
	button.file.active {
		background-color: var(--primary);
		color: var(--onPrimary);
	}
</style>
