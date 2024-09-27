<script lang="ts" module>
	import {
		serializeFileAccessLevel,
		deserializeFileAccessLevel,
		type FileAccessLevel
	} from '@rizzzi/enderdrive-lib/shared';

	import { getConnection2 } from '$lib/client/client';
	import type {
		FileAccessResource,
		FileResource,
		UserResource
	} from '@rizzzi/enderdrive-lib/server';
</script>

<script lang="ts">
	import User from '$lib/client/user.svelte';
	import {
		Awaiter,
		Button,
		Dialog,
		Input,
		LoadingSpinner,
		Overlay,
		ViewMode,
		viewMode
	} from '@rizzzi/svelte-commons';
	import { writable, type Writable } from 'svelte/store';
	import { type Snippet } from 'svelte';
	import Icon from '$lib/ui/icon.svelte';

	const {
		serverFunctions: { listFileAccess, listUsers, setUserAccess, getUser, whoAmI, getMyAccess }
	} = getConnection2();

	const { resolve, file }: { resolve: () => void; file: FileResource } = $props();

	const search: Writable<string> = writable('');

	let searchBox: HTMLDivElement = $state(null as never);
	let refreshKey: number = $state(0);

	$effect(() => {
		if (searchBox == null) {
			$search = '';
		}
	});
</script>

<Dialog onDismiss={resolve}>
	{#snippet head()}
		<h2>Manage Access for "{file.name}"</h2>
	{/snippet}

	{#snippet body()}
		<div class="access-dialog" class:desktop={$viewMode & ViewMode.Desktop}>
			<div class="search" bind:this={searchBox}>
				<Input
					type="text"
					name="Search"
					value={search}
					placeholder="Search of users..."
					icon="fa-solid fa-search"
				/>
			</div>

			<div class="divider"></div>

			<div class="section">
				<h3>Existing access</h3>

				{#key refreshKey}
					{#await (async () => {
						const accesses = await listFileAccess(file.id);

						const out: [access: FileAccessResource, user: UserResource][] = [];

						for (const access of accesses) {
							const user = await getUser(['userId', access.userId]);
							out.push([access, user]);
						}

						return out;
					})()}
						<LoadingSpinner size="1em" />
					{:then accesses}
						{#if accesses.length === 0}
							<p>No other users have access to this file.</p>
						{/if}

						{#each accesses as [access, user]}
							{@render userRow(user, access)}
						{/each}
					{/await}
				{/key}
			</div>
		</div>
	{/snippet}
</Dialog>

{#if $search.length > 0}
	<Overlay
		position={[
			'offset',
			searchBox?.offsetLeft ?? 0,
			(searchBox?.offsetTop ?? 0) + (searchBox?.offsetHeight ?? 0)
		]}
		onDismiss={() => ($search = '')}
	>
		<div class="search-result">
			{#key $search}
				<Awaiter
					callback={async () => {
						const users = await listUsers({ searchString: $search });

						for (let index = 0; index < users.length; index++) {
							if (users[index].id === file.ownerUserId) {
								users.splice(index--, 1);
								continue;
							}
						}

						return users;
					}}
				>
					{#snippet success({ result: users })}
						{#if users.length === 0}
							<p>No users found.</p>
						{/if}

						{#each users as user}
							<div class="user-row">
								<Button
									onClick={async () => {
										await setUserAccess(file.id, user.id, 'Read');
										$search = '';
										refreshKey++;
									}}
									outline={false}
									buttonClass="transparent"
									container={buttonContainer}
								>
									<div class="user-entry">
										<!-- <i class="fa-solid fa-user"></i> -->
										<Icon icon="user" thickness="solid"></Icon>
										<p>
											<User hyperlink={false} {user} initials></User>
										</p>
									</div>
								</Button>
							</div>
						{/each}
					{/snippet}
				</Awaiter>
			{/key}
		</div>
	</Overlay>
{/if}

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">{@render view()}</div>
{/snippet}

{#snippet userRow(user: UserResource, access?: FileAccessResource)}
	<div class="user-row list-entry">
		<div class="user-icon"></div>
		<div class="user-name">
			<User hyperlink={false} {user} initials></User>
		</div>
		<div class="user-access">
			{#if access != null}
				{#await getMyAccess(access.fileId) then { level }}
					{#if serializeFileAccessLevel(level) >= serializeFileAccessLevel('Manage')}
						<select
							onchange={async ({ currentTarget: { value } }) => {
								const level: FileAccessLevel = value as FileAccessLevel;

								await setUserAccess(file.id, user.id, level);
								refreshKey++;
							}}
						>
							{@render option('Read')}
							{@render option('ReadWrite')}
							{@render option('Manage')}
							{@render option('Full')}
						</select>

						<Button
							buttonClass="transparent"
							outline={false}
							onClick={async () => {
								await setUserAccess(file.id, user.id, 'None');
								refreshKey++;
							}}
							container={actionIconContainer}
						>
							<Icon icon="x" thickness="solid"></Icon>
						</Button>
					{:else}
						<p><i>{deserializeFileAccessLevel(access.level)}</i></p>
					{/if}
				{/await}
			{:else}
				<p><i>Owner</i></p>
			{/if}

			{#snippet option(level: FileAccessLevel)}
				<option value={level} selected={serializeFileAccessLevel(level) === access?.level}>
					{level}
				</option>
			{/snippet}
		</div>
	</div>
{/snippet}

{#snippet actionIconContainer(view: Snippet)}
	<div class="action-icon">
		{@render view()}
	</div>
{/snippet}

<style lang="scss">
	div.button-container {
		padding: 8px;
	}

	div.search {
		display: flex;
		flex-direction: column;
	}

	div.access-dialog {
		display: flex;
		flex-direction: column;

		gap: 16px;
	}

	div.access-dialog.desktop {
		min-height: min(512px, 100dvh - 128px);
		min-height: min(512px, 100dvh - 128px);
	}

	div.search-result {
		display: flex;
		flex-direction: column;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		padding: 8px;
		border-radius: 8px;
		box-sizing: border-box;
		box-shadow: 2px 2px 8px var(--shadow);

		min-width: 256px;

		overflow: hidden auto;
	}

	div.user-row {
		display: flex;
		flex-direction: column;
	}

	div.user-entry {
		display: flex;
		flex-direction: row;
		gap: 8px;

		align-items: center;

		> p {
			flex-grow: 1;
		}
	}

	div.user-row.list-entry {
		flex-direction: row;

		align-items: center;

		> div.user-name {
			flex-grow: 1;
		}

		> div.user-access {
			> select {
				padding: 8px;
			}
		}
	}

	div.action-icon {
		padding: 8px;
	}

	div.divider {
		min-height: 1px;
		max-height: 1px;

		background-color: var(--primaryContainer);
	}

	div.section {
		display: flex;
		flex-direction: column;

		overflow: hidden auto;
		min-height: 0px;
	}
</style>
