<script lang="ts" module>
	import type {
		FileAccessResource,
		FileResource,
		FileSnapshotResource,
		UserResource
	} from '@rizzzi/enderdrive-lib/shared';
	import { type FileAccessLevel, type ScanFolderSortType } from '@rizzzi/enderdrive-lib/shared';
	import { setContext } from 'svelte';
	import { writable, type Readable, type Writable } from 'svelte/store';

	export type SourceEvent = MouseEvent | TouchEvent;

	export type FileManagerOnFileIdCallback = (event: SourceEvent, fileId: number | null) => void;
	export type FileManagerOnPageCallback = (
		event: SourceEvent,
		page: 'files' | 'shared' | 'trashed' | 'starred'
	) => void;
	export type FileManagerOnNewCallback = (event: SourceEvent, presetFiles?: File[]) => void;
	export type FileManagerOnViewCallback = (event: SourceEvent) => void;
	export type FileManagerOnClipboardCallback = (
		event: SourceEvent,
		files: FileResource[] | null,
		cut: boolean
	) => void;
	export type FileManagerOnSortCallback = (
		event: SourceEvent,
		sort: ScanFolderSortType,
		desc: boolean
	) => void;

	export type FileManagerProps = {
		refresh: Writable<() => void>;

		onFileId: FileManagerOnFileIdCallback;
		onPage: FileManagerOnPageCallback;
		onSort: FileManagerOnSortCallback;

		sort: Readable<[sort: ScanFolderSortType, desc: boolean]>;
	} & (
		| {
				page: 'files';

				onNew: FileManagerOnNewCallback;
				onClipboard: FileManagerOnClipboardCallback;

				fileId: Readable<number | null>;
				clipboard: Readable<[files: FileResource[], cut: boolean] | null>;
		  }
		| {
				page: 'shared' | 'starred' | 'trash';
		  }
	);

	export type FileManagerResolved =
		| {
				status: 'loading';
		  }
		| {
				status: 'error';
				error: Error;
		  }
		| ({
				status: 'success';
				me: UserResource;
		  } & (
				| ({
						page: 'files';

						file: FileResource;
						filePathChain: FileResource[];
						myAccess: {
							level: FileAccessLevel;
							access: FileAccessResource | null;
						};
						accesses: FileAccessResource[];
						isStarred: boolean;
						// logs: FileLogResource[];
						selection: Writable<FileResource[]>;
				  } & (
						| {
								type: 'file';

								viruses: string[];
								snapshots: FileSnapshotResource[];
						  }
						| {
								type: 'folder';

								files: FileResource[];
						  }
				  ))
				| {
						page: 'shared' | 'starred' | 'trash';

						files: FileResource[];
						selection: Writable<FileResource[]>;
				  }
		  ));

	export interface FileManagerContext {
		refreshKey: Writable<number>;

		resolved: Writable<FileManagerResolved>;

		viewDialog: Writable<[element: HTMLElement] | null>;
		accessDialogs: Writable<[file: FileResource] | null>;

		listViewMode: Writable<FileManagerViewMode>;
		showSideBar: Writable<boolean>;
		addressBarMenu: Writable<[element: HTMLElement, file: FileResource] | null>;
	}

	export type FileManagerActionGenerator = () => FileManagerAction | null;

	export const FileManagerPropsName = 'fm-props';
	export const FileManagerContextName = 'fm-context';
</script>

<script lang="ts">
	import {
		Awaiter,
		Banner,
		LoadingSpinner,
		Title,
		ViewMode,
		viewMode
	} from '@rizzzi/svelte-commons';

	import { getConnection } from '$lib/client/client';
	import { persisted } from 'svelte-persisted-store';
	import FileManagerActionBar, { type FileManagerAction } from './file-manager-action-bar.svelte';
	import FileManagerFolderList from './file-manager-folder-list.svelte';
	import FileManagerSideBar from './file-manager-side-bar.svelte';
	import FileManagerBottomBar from './file-manager-bottom-bar.svelte';
	import FileManagerFileView from './file-manager-file-view.svelte';
	import FileManagerSeparator from './file-manager-separator.svelte';
	import FileManagerAddressBar from './file-manager-address-bar.svelte';
	import FileManagerView from './file-manager-view.svelte';
	import FileManagerDeleteConfirm from './file-manager-delete-confirm.svelte';
	import FileManagerAccessDialog from './file-manager-access-dialog.svelte';
	import FileManagerDetailsDialog from './file-manager-details-dialog.svelte';
	import FileManagerAddressBarMenu from './file-manager-address-bar-menu.svelte';
	import type { FileManagerViewMode } from './file-manager-folder-list';

	const { ...props }: FileManagerProps = $props();
	const { refresh, sort } = props;

	const {
		serverFunctions: {
			whoAmI,
			getFile,
			getFilePathChain,
			getMyAccess,
			listFileAccess,
			isFileStarred,
			listFileLogs,
			listFileSnapshots,
			listFileViruses,
			listSharedFiles,
			listStarredFiles,
			listTrashedFiles,
			scanFolder
		}
	} = getConnection();

	setContext<FileManagerProps>(FileManagerPropsName, props);
	const { refreshKey, resolved, showSideBar, viewDialog, accessDialogs, addressBarMenu } =
		setContext<FileManagerContext>(FileManagerContextName, {
			refreshKey: writable(0),
			resolved: writable({ status: 'loading' }),

			viewDialog: writable(null),
			accessDialogs: writable(null),

			listViewMode: persisted('fm-list-mode', 'grid'),
			showSideBar: persisted('side-bar', false),
			addressBarMenu: writable(null)
		});

	refresh.set(() => refreshKey.update((value) => value + 1));

	const fileId = props.page === 'files' ? props.fileId : writable(null);

	fileId.subscribe(() => $refresh());

	async function load(): Promise<void> {
		$resolved = { status: 'loading' };

		try {
			// await new Promise<void>((resolve) => setTimeout(resolve, 1000));
			// throw new Error('Simulated Exception');

			const me = (await whoAmI())!;

			if (props.page === 'files') {
				const file = await getFile($fileId);
				const [filePathChain, myAccess, accesses, isStarred /* logs */] = await Promise.all([
					getFilePathChain(file.id),
					getMyAccess(file.id),
					listFileAccess(file.id),
					isFileStarred(file.id)
					// listFileLogs(file.id)
				]);
				const selection = writable<FileResource[]>([]);

				if (file.type === 'file') {
					const [viruses, snapshots] = await Promise.all([
						listFileViruses(file.id),
						listFileSnapshots(file.id)
					]);

					selection.update((selected) => {
						selected.push(file);

						return selected;
					});

					$resolved = {
						me,
						page: 'files',
						status: 'success',
						file,
						filePathChain,
						myAccess,
						accesses,
						type: 'file',
						viruses,
						snapshots,
						selection,
						isStarred
					};
				} else if (file.type === 'folder') {
					const files = await scanFolder(file.id, $sort);

					$resolved = {
						me,
						page: 'files',
						status: 'success',
						file,
						filePathChain,
						myAccess,
						accesses,
						type: 'folder',
						files,
						selection,
						isStarred
					};
				}
			} else if (props.page === 'shared') {
				const shareList = await listSharedFiles();
				const files: FileResource[] = [];
				for (const sharedFile of shareList) {
					try {
						const file = await getFile(sharedFile.fileId);
						files.push(file);
					} catch {}
				}

				$resolved = {
					me,
					status: 'success',
					page: 'shared',
					files,
					selection: writable([])
				};
			} else if (props.page === 'starred') {
				const starredList = await listStarredFiles();
				const files: FileResource[] = [];
				for (const starredFile of starredList) {
					try {
						const file = await getFile(starredFile.fileId);
						files.push(file);
					} catch {}
				}

				$resolved = {
					me,
					status: 'success',
					page: 'starred',
					files,
					selection: writable([])
				};
			} else if (props.page === 'trash') {
				const files = await listTrashedFiles();

				$resolved = {
					me,
					status: 'success',
					page: 'trash',
					files,
					selection: writable([])
				};
			}
		} catch (error: unknown) {
			$resolved = { status: 'error', error: error as Error };
		}
	}
</script>

{#key $refreshKey}
	<Awaiter callback={load} />
{/key}

<div
	class="file-manager"
	class:mobile={$viewMode & ViewMode.Mobile}
	class:desktop={$viewMode & ViewMode.Desktop}
>
	{#if props.page === 'files'}
		<FileManagerAddressBar />
	{/if}

	<div
		class="main-view"
		class:mobile={$viewMode & ViewMode.Mobile}
		class:desktop={$viewMode & ViewMode.Desktop}
		class:loading={$resolved.status === 'loading'}
		class:preview-mode={$resolved.status === 'success' &&
			$resolved.page === 'files' &&
			$resolved.type === 'file'}
	>
		{#if $resolved.status === 'loading'}
			<LoadingSpinner size="64px" />
		{:else if $resolved.status === 'error'}
			<FileManagerActionBar />
			<FileManagerSeparator orientation="horizontal" with-margin />
			<Banner bannerClass="error">
				<div class="main-view-error">
					<h3>{$resolved.error.name}: {$resolved.error.message}</h3>
					<pre>{$resolved.error.stack}</pre>
				</div>
			</Banner>
		{:else if $resolved.status === 'success'}
			{#if $resolved.page === 'files'}
				<Title title={$resolved.file.name} />
			{/if}

			{#if $viewMode & ViewMode.Desktop}
				<FileManagerActionBar />
				<FileManagerSeparator orientation="horizontal" with-margin />
			{/if}

			<div class="view-row">
				{#if $resolved.page === 'files' && $resolved.type === 'file'}
					<FileManagerFileView fileId={$fileId!} />
				{:else}
					<FileManagerFolderList />
				{/if}

				{#if $viewMode & ViewMode.Desktop && $showSideBar}
					<FileManagerSeparator orientation="vertical" with-margin />
					<FileManagerSideBar />
				{/if}
			</div>

			{#if $viewMode & ViewMode.Desktop}
				<FileManagerSeparator orientation="horizontal" with-margin />
				<FileManagerBottomBar />
			{/if}

			{#if $viewMode & ViewMode.Mobile}
				<FileManagerSeparator orientation="horizontal" />
				<FileManagerActionBar />
			{/if}
		{/if}
	</div>
</div>

{#if $viewDialog != null}
	{@const [element] = $viewDialog}

	<FileManagerView
		{element}
		onDismiss={() => {
			$viewDialog = null;
		}}
	/>
{/if}

<FileManagerDeleteConfirm />
<FileManagerDetailsDialog />

{#if $accessDialogs != null}
	<FileManagerAccessDialog
		file={$accessDialogs[0]}
		resolve={() => {
			$accessDialogs = null;
		}}
	/>
{/if}

{#if $addressBarMenu != null}
	<FileManagerAddressBarMenu
		element={$addressBarMenu[0]}
		file={$addressBarMenu[1]}
		onDismiss={() => {
			$addressBarMenu = null;
		}}
	/>
{/if}

<style lang="scss">
	div.file-manager {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		min-width: 0px;
		min-height: 0px;
	}

	div.file-manager.desktop {
		padding: 16px;

		gap: 8px;
	}

	div.file-manager.mobile {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);
	}

	div.main-view {
		display: flex;
		flex-direction: column;

		flex-grow: 1;

		min-height: 256px;

		overflow: hidden auto;

		div.main-view-error {
			> pre {
				overflow: auto;
			}
		}
	}

	div.main-view.desktop {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		padding: 8px;
		border-radius: 8px;
	}

	div.main-view.loading {
		justify-content: center;
		align-items: center;
	}

	div.view-row {
		flex-grow: 1;

		display: flex;
		flex-direction: row;

		min-height: 0px;
	}
</style>
