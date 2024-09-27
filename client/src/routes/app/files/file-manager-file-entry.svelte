<script lang="ts">
	import type { FileResource, Mime } from '@rizzzi/enderdrive-lib/server';
	import FileManagerSeparator from './file-manager-separator.svelte';
	import { getConnection2 } from '$lib/client/client';
	import type { FileManagerViewMode } from './file-manager-folder-list';

	const { file, listViewMode }: { file: FileResource; listViewMode: FileManagerViewMode } =
		$props();
	const {
		serverFunctions: { getFileMime }
	} = getConnection2();

	async function load(): Promise<Mime> {
		const mime = await getFileMime(file.id);

		return mime;
	}
</script>

<div class="thumbnail {listViewMode}">
	{#if file.type === 'folder'}
		<i class="fa-regular fa-folder"></i>
	{:else if file.type === 'file'}
		<img src="/favicon.svg" alt="Thumbnail" />
	{/if}
</div>

<FileManagerSeparator orientation="horizontal" with-margin />

<div class="file-info {listViewMode}">
	<i class="fa-regular fa-{file.type}"></i>
	<p>{file.name}</p>
</div>

<style lang="scss">
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
