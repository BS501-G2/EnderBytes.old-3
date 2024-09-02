<script lang="ts">
	import { getConnection } from '$lib/client/client';
	import User from '$lib/client/user.svelte';
	import type {
		FileAccessResource,
		FileLogResource,
		FileResource,
		UserResource
	} from '@rizzzi/enderdrive-lib/server';
	import { byteUnit, deserializeFileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
	import {
		Awaiter,
		Button,
		Dialog,
		LoadingSpinner,
		ViewMode,
		viewMode
	} from '@rizzzi/svelte-commons';
	import { getContext, onMount, type Snippet } from 'svelte';
	import { type FileManagerContext, FileManagerContextName } from './file-manager.svelte';
	import Action from '../admin/logs/action.svelte';

	const { accessDialogs } = getContext<FileManagerContext>(FileManagerContextName);

	const {
		embedded = false,
		file,
		onDismiss
	}: { embedded?: boolean; file: FileResource; onDismiss?: () => void } = $props();

	onMount(() => {
		return viewMode.subscribe((value) => {
			if (value & ViewMode.Desktop) {
				onDismiss?.();
			}
		});
	});

	type Data = {
		file: FileResource;
		owner: UserResource;
		creator: UserResource;

		time: { createTime: number; modifyTime: number };
		accesses: [access: FileAccessResource, user: UserResource][];

		logs: [log: FileLogResource, user: UserResource][];
	} & (
		| {
				type: 'file';

				mime: [mime: string, description: string];
				size: number;
		  }
		| {
				type: 'folder';
		  }
	);

	async function load(): Promise<Data> {
		await new Promise<void>((resolve) => setTimeout(resolve, 100));

		const {
			serverFunctions: {
				getFileSize,
				getFileTime,
				listFileAccess,
				getUser,
				getFileMime,
				listFileLogs
			}
		} = getConnection();

		const owner = await getUser(['userId', file.ownerUserId]);
		const creator = await getUser(['userId', file.creatorUserId]);

		const time = await getFileTime(file.id);
		const accesses = await (async () => {
			const accesses: [access: FileAccessResource, user: UserResource][] = [];

			for (const access of await listFileAccess(file.id)) {
				const user = await getUser(['userId', access.userId]);

				accesses.push([access, user]);
			}

			return accesses;
		})();
		const logs = await (async () => {
			const logs: [log: FileLogResource, user: UserResource][] = [];

			for (const log of await listFileLogs(file.id)) {
				const user = await getUser(['userId', log.actorUserId]);

				logs.push([log, user]);
			}

			return logs;
		})();

		if (file.type === 'file') {
			const size = await getFileSize(file.id);
			const mime = await getFileMime(file.id);

			return { file, type: 'file', size, time, accesses, owner, creator, mime, logs };
		} else if (file.type === 'folder') {
			return { file, type: 'folder', time, accesses, owner, creator, logs };
		}

		throw new Error('Unknown file type');
	}

	let tab: number = $state(1);
	let refreshKey: number = $state(0);
</script>

{#if embedded}
	{#key refreshKey}
		{@render layout()}
	{/key}
{:else}
	<Dialog onDismiss={() => onDismiss?.()}>
		{#snippet head()}
			<h2>{file.name}</h2>
		{/snippet}
		{#snippet body()}
			{#key refreshKey}
				{@render layout()}
			{/key}
		{/snippet}
	</Dialog>
{/if}

{#snippet overview(data: Data)}
	<table class="overview-table">
		<tbody>
			{#if data.type == 'file'}
				<tr>
					<th class="details-name">Type</th>
					<td class="details-value">{data.mime[1]}</td>
				</tr>

				<tr>
					<th class="details-name">Size</th>
					<td class="details-value">{byteUnit(data.size)}</td>
				</tr>
			{/if}

			<tr>
				<th class="details-name">Created</th>
				<td class="details-value"> {new Date(data.time.createTime).toLocaleString()}</td>
			</tr>

			{#if data.time.createTime !== data.time.modifyTime}
				<tr>
					<th class="details-name">Modified</th>
					<td class="details-value">
						{new Date().toLocaleString()}
					</td>
				</tr>
			{/if}
		</tbody>
	</table>
{/snippet}

{#snippet access(data: Data)}
	{@const owner = data.owner}

	<table class="overview-table">
		<tbody>
			<tr>
				<th class="details-name">Owner</th>
				<td class="details-value">
					<User hyperlink user={owner} />
				</td>
			</tr>

			{#if owner.id != data.creator.id}
				<tr>
					<th class="details-name">Creator</th>
					<td class="details-value">
						<User hyperlink user={data.creator} />
					</td>
				</tr>
			{/if}
		</tbody>
	</table>

	<div class="access-list">
		{#each data.accesses as access}
			<p>
				<i class="fa-solid fa-user"></i>
				<User user={access[1]} hyperlink /> has {deserializeFileAccessLevel(access[0].level)} access
			</p>
		{/each}
	</div>

	<Button
		container={buttonContainer}
		onClick={() => {
			$accessDialogs = [file];
		}}
		buttonClass="transparent"
	>
		Manage Access
	</Button>
{/snippet}

{#snippet logs(result: Data)}
	{@const logs = result.logs}
	<div class="file-logs">
		{#each logs as [log]}
			<Action {log} />
		{/each}
	</div>
{/snippet}

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">{@render view()}</div>
{/snippet}

{#snippet layout()}
	<div class="details">
		<div class="thumbnail-row">
			<div class="thumbnail">
				<img src="/favicon.svg" alt={file.name} />
			</div>
		</div>
		<div class="info-row">
			{#snippet tabButton(index: number, name: string)}
				{#snippet buttonContainer(view: Snippet)}
					<div class="button-container" class:selected={index == tab}>{@render view()}</div>
				{/snippet}

				<Button
					buttonClass="transparent"
					container={buttonContainer}
					outline={false}
					onClick={() => {
						tab = index;
					}}
				>
					<p class="tab-label">{name}</p>
				</Button>
			{/snippet}

			<Awaiter callback={() => load()}>
				{#snippet success({ result })}
					<div class="inner-view">
						<div class="tab-row">
							{@render tabButton(0, 'Overview')}
							{@render tabButton(1, 'Access')}
							{@render tabButton(2, 'Logs')}
						</div>

						<div class="page-view">
							{#if tab == 0}
								{@render overview(result)}
							{:else if tab == 1}
								{@render access(result)}
							{:else if tab == 2}
								{@render logs(result)}
							{/if}
						</div>
					</div>
				{/snippet}

				{#snippet loading()}
					<LoadingSpinner size="64px" />
				{/snippet}
			</Awaiter>
		</div>
	</div>
{/snippet}

<style lang="scss">
	div.details {
		flex-grow: 1;

		display: flex;
		flex-direction: column;
		gap: 8px;

		min-height: 0;

		> div.thumbnail-row {
			padding: 32px;

			display: flex;
			flex-direction: column;
			align-items: center;

			> div.thumbnail {
				aspect-ratio: 1;
				max-height: 256px;

				> img {
					min-width: 100%;
					max-width: 100%;
					min-height: 100%;
					max-height: 100%;
				}
			}
		}

		> div.info-row {
			flex-grow: 1;

			display: flex;
			flex-direction: column;
			gap: 8px;

			min-height: 0;

			justify-content: safe center;
			align-items: center;
		}
	}

	div.button-container {
		padding: 8px;

		border-bottom: solid 2px transparent;
	}

	div.button-container.selected {
		border-bottom-color: var(--primary);
	}

	p.tab-label {
		max-lines: 1;
		text-overflow: ellipsis;
		overflow: hidden;
	}

	div.inner-view {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		min-width: 100%;
		max-width: 100%;

		min-height: 0;

		gap: 8px;
	}

	div.tab-row {
		display: flex;
		flex-direction: row;

		justify-content: center;
	}

	div.page-view {
		flex-grow: 1;

		display: flex;
		flex-direction: column;
		gap: 8px;

		overflow: hidden auto;

		min-height: 0px;
	}

	th.details-name,
	td.details-value {
		padding: 2px 8px;
		font-size: 1em;
	}

	th.details-name {
		text-align: start;
	}

	th.details-name::after {
		content: ':';
	}

	td.details-value {
		text-align: end;

		overflow: hidden;
	}

	div.button-container {
		padding: 8px;
	}

	div.access-list {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		min-height: 0px;

		overflow: hidden auto;
	}

	div.file-logs {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		min-height: 0px;

		gap: 4px;
	}
</style>
