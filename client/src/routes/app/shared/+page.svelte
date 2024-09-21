<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { DashboardContextName, type DashboardContext } from '../dashboard';
	import FileManager, {
		type FileManagerOnPageCallback,
		type FileManagerOnFileIdCallback
	} from '../files/file-manager.svelte';
	import { Title } from '@rizzzi/svelte-commons';
	import { goto } from '$app/navigation';
	import type { ScanFolderSortType } from '@rizzzi/enderdrive-lib/shared';

	const { setMainContent } = getContext<DashboardContext>(DashboardContextName);

	const refresh: Writable<() => void> = writable(null as never);
	const sort: Writable<[sort: ScanFolderSortType, desc: boolean]> = writable(['fileName', false]);

	const onPage: FileManagerOnPageCallback = (...[, page]) => {
		goto(`/app/${page}`);
	};

	const onFileId: FileManagerOnFileIdCallback = (...[, newFileId]) => {
		goto(`/app/files${newFileId != null ? `?fileId=${newFileId}` : ''}`);
	};

	onMount(() => setMainContent(layout));
</script>

<Title title="Shared Files" />

{#snippet layout()}
	<FileManager
		page="shared"
		{onPage}
		{onFileId}
		{refresh}
		{sort}
		onSort={(event, column, desc) => {
			$sort = [column, desc];
		}}
	/>
{/snippet}
