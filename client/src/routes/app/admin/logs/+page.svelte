<script lang="ts">
	import { onMount, getContext, type Snippet } from 'svelte';
	import { type AdminContext, AdminContextName } from '../+layout.svelte';
	import { getConnection } from '$lib/client/client';
	import type { FileLogResource } from '@rizzzi/enderdrive-lib/server';
	import { Input, Overlay, Button } from '@rizzzi/svelte-commons';
	import User from '$lib/client/user.svelte';
	import Action from './action.svelte';
	import { writable, type Writable } from 'svelte/store';
	import { goto } from '$app/navigation';
	import Paginator from '$lib/ui/paginator.svelte';
	import type { UIEventHandler } from 'svelte/elements';
	import type { FileLogType } from '@rizzzi/enderdrive-lib/shared';

	const { setMainContent, pushTopContent, pushToolboxContext } =
		getContext<AdminContext>(AdminContextName);

	onMount(() => setMainContent(main));
	onMount(() => pushTopContent(top));
	onMount(() => pushToolboxContext(filterUser));
	onMount(() => pushToolboxContext(filterAction));

	const {
		serverFunctions: { listFileLogs, listUsers, adminListFileLogs }
	} = getConnection();

	let filterUsers: number[] = $state([]);
	let filterActions: FileLogType[] = $state([]);

	let searchElement: HTMLDivElement = $state(null as never);
	let searchString: Writable<string> = writable('');

	let listElement: HTMLDivElement = $state(null as never);

	type ActionButton = () => void;
</script>

{#snippet filterUser()}
	<div class="user-filter">
		<h3>Users</h3>

		<p>Filter the list of users.</p>

		<div bind:this={searchElement} class="search">
			<Input
				name="Search"
				type="text"
				placeholder="Search"
				icon="fa-solid fa-magnifying-glass"
				value={searchString}
			/>
		</div>

		{#if filterUsers.length > 0}
			<div class="filtered-users">
				{#each filterUsers as userId}
					<div class="filtered-user">
						<div class="user-image">
							<img src="/favicon.svg" alt="User" />
						</div>

						<div class="user-name">
							<User {userId} hyperlink={false} />
						</div>

						<div class="user-actions">
							<Button
								onClick={() => {
									const index = filterUsers.indexOf(userId);
									if (index !== -1) {
										filterUsers.splice(index, 1);
										filterUsers = [...filterUsers];
									}
								}}
								buttonClass="transparent"
								outline={false}
							>
								<i class="fa-solid fa-times"></i>
							</Button>
						</div>
					</div>
				{/each}
			</div>
		{/if}

		{#if $searchString.length > 0}
			<Overlay
				position={[
					'offset',
					searchElement.offsetLeft,
					searchElement.offsetTop + searchElement.offsetHeight
				]}
			>
				<div class="search-results">
					{#await listUsers({ searchString: $searchString }) then users}
						{#each users as user}
							{#if filterUsers.findIndex((u) => u === user.id) === -1}
								<button
									class="search-entry"
									onclick={() => {
										filterUsers.push(user.id);
										filterUsers = [...filterUsers];

										$searchString = '';
									}}
								>
									<User {user} hyperlink={false} />
								</button>
							{/if}
						{/each}
					{/await}
				</div>
			</Overlay>
		{/if}
	</div>
{/snippet}

{#snippet filterAction()}
	<h3>Actions</h3>

	<p>Filter the list of actions.</p>

	<div class="filter-actions">
		{#snippet checkbox(value: FileLogType)}
			<div class="filter-action">
				<input id="cb-{value}" type="checkbox" name={value} bind:group={filterActions} {value} />
				<label for="cb-{value}">{value}</label>
			</div>
		{/snippet}

		{@render checkbox('create')}
		{@render checkbox('modify')}
		{@render checkbox('access')}
		{@render checkbox('delete')}
		{@render checkbox('restore')}
		{@render checkbox('revert')}
		{@render checkbox('grant-access')}
		{@render checkbox('revoke-access')}
	</div>
{/snippet}

{#snippet top()}
	<div class="title">
		<h2>Logs</h2>
	</div>
{/snippet}

{#snippet main()}
	{#snippet log2(log: FileLogResource)}
		{#snippet actions()}
			{#snippet button(name: string, icon: string, action: ActionButton)}
				<Button buttonClass="transparent" outline={false} hint={name} onClick={action}>
					<i class={icon}></i>
				</Button>
			{/snippet}

			{@render button('View User', 'fa-solid fa-user', () => {
				return goto(`/app/users/?id=:${log.actorUserId}`);
			})}

			{@render button('View File', 'fa-solid fa-file', () => {
				return goto(`/app/files/?id=:${log.targetFileId}`);
			})}
		{/snippet}

		<Action {log} include-file hoverControls={[actions]} />
	{/snippet}

	{#key filterUsers}
		{#key filterActions}
			{#snippet container(onScrollEnd: UIEventHandler<HTMLDivElement>, view: Snippet)}
				<div bind:this={listElement} class="action-list" onscroll={onScrollEnd}>
					{@render view()}
				</div>
			{/snippet}

			<Paginator
				container={[listElement, container]}
				item={log2}
				load={async (offset, length): Promise<FileLogResource[]> => {
					const logs = await adminListFileLogs(
						undefined,
						filterUsers != null && filterUsers.length > 0 ? filterUsers : undefined,
						filterActions != null && filterActions.length > 0 ? filterActions : undefined,
						offset,
						length
					);

					return logs;
				}}
				length={5}
			/>
		{/key}
	{/key}
{/snippet}

<style lang="scss">
	div.action-list {
		display: flex;
		flex-direction: column;

		min-height: 0px;

		overflow: hidden auto;

		gap: 8px;
	}

	div.title {
		flex-grow: 1;

		display: flex;
		flex-direction: row;
	}

	div.search {
		display: flex;
		flex-direction: column;
	}

	div.user-filter {
		display: flex;
		flex-direction: column;

		gap: 8px;
	}

	div.search-results {
		display: flex;
		flex-direction: column;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		box-shadow: 2px 2px 8px var(--shadow);

		border-radius: 8px;
		padding: 8px;

		min-width: 192px;
		max-width: 192px;
	}

	button.search-entry {
		display: flex;
		flex-direction: column;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		border: none;

		border-radius: 8px;
		padding: 8px;
	}

	button.search-entry:hover {
		background-color: var(--primaryContainer);
		color: var(--onPrimaryContainer);
	}

	div.filtered-users {
		display: flex;
		flex-direction: column;

		gap: 8px;
	}

	div.filtered-user {
		display: flex;
		flex-direction: row;

		align-items: center;

		gap: 8px;

		> div.user-image {
			display: flex;
			flex-direction: column;

			> img {
				min-width: 32px;
				max-width: 32px;
				min-height: 32px;
				max-height: 32px;
			}
		}

		> div.user-name {
			flex-grow: 1;
		}
	}
</style>
