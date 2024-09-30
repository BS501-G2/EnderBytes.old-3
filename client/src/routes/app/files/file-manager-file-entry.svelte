	<script lang="ts">
	import type { FileResource } from '@rizzzi/enderdrive-lib/server';
	import { FileManagerViewMode } from './file-manager-folder-list';
	import FileManagerSeparator from './file-manager-separator.svelte';

	const {
		listViewMode,
		file,
		selected,
		onDblClick,
		onClick
	}: {
		file: FileResource;
		listViewMode: FileManagerViewMode;
		selected: boolean;
		onClick: (
			event: MouseEvent & {
				currentTarget: EventTarget & HTMLButtonElement;
			}
		) => void;
		onDblClick: (
			event: MouseEvent & {
				currentTarget: EventTarget & HTMLButtonElement;
			}
		) => void;
	} = $props();
</script>

<!-- class:selected={$selected.includes(file)} -->

<button
	class="file-entry"
	class:grid={listViewMode == FileManagerViewMode.Grid}
	class:list={listViewMode == FileManagerViewMode.List}
	class:selected
	ondblclick={onDblClick}
	oncontextmenu={(event) => {
		event.preventDefault();
	}}
	onclick={onClick}
>
	<div class="thumbnail grid">
		{#if file.type === 'folder'}
			<i class="fa-regular fa-folder"></i>
		{:else if file.type === 'file'}
			<img src="/favicon.svg" alt="Thumbnail" />
		{/if}
	</div>

	<FileManagerSeparator orientation="horizontal" with-margin />
	<div class="file-info grid">
		<i class="fa-regular fa-{file.type}"></i>
		<p>{file.name}</p>
	</div>
</button>

<style lang="scss">
	button.file-entry.grid {
		display: flex;
		flex-direction: column;

		margin: 8px;
		padding: 4px;
		border-radius: 8px;

		background-color: var(--background);
		color: var(--onBackground);
		border: solid 1px var(--shadow);
	}

	button.file-entry.grid:hover {
		cursor: pointer;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		border-color: var(--onBackgroundVariant);
	}

	button.file-entry.grid.selected {
		background-color: var(--primary);
		color: var(--onPrimary);
	}

	div.thumbnail.grid {
		display: flex;
		flex-direction: column;

		align-items: center;
		justify-content: center;

		min-width: 100%;
		box-sizing: border-box;

		padding: 8px;

		aspect-ratio: 4 / 3;
		overflow: hidden;

		> img {
			min-width: 100%;
			min-height: 100%;
			max-width: 100%;
			max-height: 100%;

			border-radius: 8px;

			box-sizing: border-box;

			object-fit: cover;
		}

		> i {
			font-size: 4em;
		}
	}

	div.file-info.grid {
		display: flex;
		flex-direction: row;

		align-items: center;

		padding: 8px;
		gap: 8px;

		min-height: 1.2em;
		max-width: 100%;
		box-sizing: border-box;

		> p {
			flex-grow: 1;

			text-overflow: ellipsis;
			text-wrap: nowrap;
			text-align: start;

			max-lines: 1;
			max-width: calc(100%);

			overflow: hidden;
		}
	}
</style>
