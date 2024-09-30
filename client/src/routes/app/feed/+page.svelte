<script lang="ts">
	import { getConnection } from '$lib/client/client';
	import { type FileAccessResource } from '@rizzzi/enderdrive-lib/server';
	import { Button, LoadingSpinner } from '@rizzzi/svelte-commons';
	import FileManagerFileEntry from '../files/file-manager-file-entry.svelte';
	import User from '$lib/client/user.svelte';
	import { goto } from '$app/navigation';
	import Icon from '$lib/ui/icon.svelte';
	import { FileManagerViewMode } from '../files/file-manager-folder-list';

	const {
		serverFunctions: { listSharedFiles, getFile, whoAmI }
	} = getConnection();

	function groupByTime(fileAccesses: FileAccessResource[]): FileAccessResource[][] {
		const groups: FileAccessResource[][] = [];

		for (const fileAccess of fileAccesses) {
			let current: FileAccessResource[] = [];

			if (groups[0]?.[0]?.granterUserId == fileAccess.granterUserId) {
				current = groups[0];
			} else {
				groups.push(current);
			}

			current.push(fileAccess);
		}

		return groups;
	}
</script>

{#snippet sharedFiles(loading: boolean, fileAccesses: FileAccessResource[])}
	{#if loading}
		<div class="section-loading">
			<LoadingSpinner size="1em" />
		</div>
	{:else if fileAccesses.length > 0}
		<div class="file-accesses">
			<div class="header">
				<h2>Recently Shared Files</h2>
				<Button onClick={() => goto('/app/shared')}>See More</Button>
			</div>
			<div class="list">
				{#each groupByTime(fileAccesses) as group}
					<div class="group">
						<div class="sharer">
							<p>
								<Icon icon="user-group" thickness="solid" /> Shared by <User
									userId={group[0].granterUserId}
								/>
							</p>
						</div>
						<div class="entries">
							{#each group as fileAccess}
								{#await getFile(fileAccess.fileId)}
									<LoadingSpinner size="1em" />
								{:then file}
									<div class="file-entry">
										<FileManagerFileEntry
											{file}
											listViewMode={FileManagerViewMode.Grid}
											selected={false}
											onClick={() => goto(`/app/files?fileId=${file.id}`)}
											onDblClick={() => goto(`/app/files?fileId=${file.id}`)}
										/>
									</div>
								{/await}
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
{/snippet}

<div class="page">
	{#await listSharedFiles(undefined, undefined, 0, 15)}
		{@render sharedFiles(true, [])}
	{:then fileAccesses}
		{@render sharedFiles(false, fileAccesses)}
	{/await}
</div>

<style lang="scss">
	div.page {
		flex-grow: 1;

		padding: 16px;
	}

	div.file-accesses {
		display: flex;
		flex-direction: column;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		padding: 8px 16px;
		border-radius: 8px;
		gap: 8px;

		> div.header {
			display: flex;
			flex-direction: row;

			justify-content: space-between;
			align-items: center;
		}

		> div.list {
			display: flex;
			flex-direction: row;

			gap: 8px;

			> div.group {
				background-color: var(--background);
				color: var(--onBackground);

				display: flex;
				flex-direction: column;
				padding: 8px;
				border-radius: 8px;

				> div.sharer {
				}

				> div.entries {
					> div.file-entry {
						display: flex;
						flex-direction: column;

						max-width: 172px;
					}
				}
			}
		}
	}
</style>
