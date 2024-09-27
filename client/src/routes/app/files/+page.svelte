<script lang="ts">
	import { derived, writable, type Writable } from 'svelte/store';
	import FileManager, {
		type FileManagerOnClipboardCallback,
		type FileManagerOnFileIdCallback,
		type FileManagerOnNewCallback,
		type FileManagerOnPageCallback
	} from './file-manager.svelte';
	import FileManagerNew from './file-manager-new.svelte';
	import { getConnection2 } from '$lib/client/client';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { executeBackgroundTask } from '$lib/background-task.svelte';
	import { byteUnit, type ScanFolderSortType } from '@rizzzi/enderdrive-lib/shared';
	import { getContext, onMount, type Snippet } from 'svelte';
	import { DashboardContextName, type DashboardContext } from '../dashboard';
	import { Title } from '@rizzzi/svelte-commons';
	import type { FileResource } from '@rizzzi/enderdrive-lib/server';

	const { setMainContent } = getContext<DashboardContext>(DashboardContextName);

	const {
		serverFunctions: { getFile, createFolder, openNewFile, writeFile }
	} = getConnection2();

	const refresh: Writable<() => void> = writable(null as never);
	const sort = derived(
		page,
		({ url: { searchParams } }): [sort: ScanFolderSortType, desc: boolean] => {
			try {
				const sort = searchParams.get('sort') as ScanFolderSortType;

				if (!(sort === 'contentSize' || sort === 'fileName' || sort === 'dateModified')) {
					return ['fileName', false];
				}

				const desc = searchParams.get('desc') === 'true';

				return [sort, desc];
			} catch (error) {
				return ['fileName', false];
			}
		}
	);
	const fileId = derived(page, ({ url: { searchParams } }) => {
		try {
			const fileId = Number.parseInt(searchParams.get('fileId') ?? '') || null;

			return fileId;
		} catch (error) {
			return null;
		}
	});

	const onPage: FileManagerOnPageCallback = (...[, page]) => {
		goto(`/app/${page}`);
	};

	const onFileId: FileManagerOnFileIdCallback = (...[, newFileId]) => {
		goto(`/app/files${newFileId != null ? `?fileId=${newFileId}` : ''}`);
	};

	const onNew: FileManagerOnNewCallback = (event, files) => {
		$newDialog = [event.currentTarget as HTMLElement, files];
	};

	const onClipboard: FileManagerOnClipboardCallback = (event, files, cut) => {
		if (files == null) {
			$clipboard = null;
		} else {
			$clipboard = [files, cut];
		}
	};

	const newDialog: Writable<[element: HTMLElement, preset?: File[]] | null> = writable(null);
	const clipboard: Writable<[files: FileResource[], cut: boolean] | null> = writable(null);

	const uploadNewFiles = (files: File[]): void => {
		const task = executeBackgroundTask(
			'File Upload',
			true,
			async (_, setStatus) => {
				// throw new Error('Test Failure');

				const updateStatus = (
					index: number,
					name: string,
					currentUploaded: number,
					currentTotal: number,
					uploaded: number,
					total: number
				) => {
					setStatus(
						`${index + 1}/${files.length}: ${name} (${byteUnit(currentUploaded)}/${byteUnit(currentTotal)})`,
						uploaded / total
					);
				};

				const parentFile = await getFile($fileId);

				const bufferSize = 1024 * 256;

				const total = files.reduce((total, file) => total + file.size, 0);
				let uploaded = 0;

				for (let index = 0; index < files.length; index++) {
					const { [index]: file } = files;

					updateStatus(index, file.name, 0, file.size, uploaded, total);
					const handleId = await openNewFile(parentFile.id, file.name);

					const promises: Promise<void>[] = [];

					for (let offset = 0; offset < file.size; offset += bufferSize) {
						const capturedOffset = offset;
						promises.push(
							(async () => {
								const buffer = file.slice(capturedOffset, capturedOffset + bufferSize);

								await writeFile(handleId, offset, new Uint8Array(await buffer.arrayBuffer()));

								updateStatus(
									index,
									file.name,
									capturedOffset + buffer.size,
									file.size,
									uploaded,
									total
								);
								uploaded += buffer.size;
							})()
						);
					}

					await Promise.all(promises);
				}

				setStatus('Task Completed', 1);
				$refresh();
			},
			false
		);

		$newDialog = null;
		void task.run();
	};

	const createNewFolder = (name: string): void => {
		const task = executeBackgroundTask(
			`New Folder: ${name}`,
			true,
			async (_, setStatus) => {
				setStatus('Creating Folder');

				const parentFile = await getFile($fileId);
				const folder = await createFolder(parentFile.id, name);

				setStatus('Task Completed', 1);
				onFileId(null as never, folder.id);
			},
			false
		);

		$newDialog = null;
		void task.run();
	};

	onMount(() => setMainContent(layout as Snippet));
</script>

<Title title="My Files" />

{#snippet layout()}
	<FileManager
		page="files"
		{refresh}
		{onPage}
		{onFileId}
		{onNew}
		{onClipboard}
		{fileId}
		{clipboard}
		{sort}
		onSort={(event, column, desc) => {
			$sort = [column, desc];
		}}
	/>

	{#if $newDialog != null}
		<FileManagerNew
			element={$newDialog[0]}
			onDismiss={() => {
				$newDialog = null;
			}}
			{uploadNewFiles}
			{createNewFolder}
			presetFiles={$newDialog[1]}
		/>
	{/if}
{/snippet}
