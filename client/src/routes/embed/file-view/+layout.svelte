<script lang="ts">
	import { page } from '$app/stores';
	import { getConnection } from '$lib/client/client';
	import type { FileResource } from '@rizzzi/enderdrive-lib/server';
	import type { Snippet } from 'svelte';
	import { derived } from 'svelte/store';
	import FileView from './file-view.svelte';
	import { LoadingSpinnerPage } from '@rizzzi/svelte-commons';

	const { children }: { children: Snippet } = $props();
	const fileId = derived(page, ({ url: { searchParams } }) => {
		const a = Number.parseInt(searchParams.get('fileId') ?? '');

		if (!a) {
			throw new Error('File ID is missing or invalid');
		}

		return a;
	});

	async function getFile(fileId: number): Promise<{
		file: FileResource;
		filePathChain: FileResource[];
		viruses: string[];
	}> {
		const {
			serverFunctions: { getFile, getFilePathChain, listFileViruses }
		} = getConnection();

		await new Promise<void>((resolve) => setTimeout(resolve, 10));

		const file = await getFile(fileId);
		const filePathChain = await getFilePathChain(fileId);
		const viruses = await listFileViruses(fileId);

		return { file, filePathChain, viruses };
	}
</script>

{#await getFile($fileId)}
	<LoadingSpinnerPage />
{:then { file, filePathChain, viruses }}
	<FileView {file} {filePathChain} {viruses}>{@render children()}</FileView>
{/await}
