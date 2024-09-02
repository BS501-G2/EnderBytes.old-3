<script lang="ts">
	import { getContext, onMount, type Snippet } from 'svelte';
	import { type AdminContext, AdminContextName } from '../layout';
	import { Input, Button } from '@rizzzi/svelte-commons';
	import { writable, type Writable } from 'svelte/store';
	import { getConnection } from '$lib/client/client';
	import User from '$lib/client/user.svelte';
	import NewUser from './new-user.svelte';
	import UserOptions from './user-options.svelte';
	import type { UserResource } from '@rizzzi/enderdrive-lib/server';
	import SuspendConfirmation from './suspend-confirmation.svelte';

	const { setMainContent, pushTopContent } = getContext<AdminContext>(AdminContextName);
	const {
		serverFunctions: { setSuspend }
	} = getConnection();

	const {
		serverFunctions: { listUsers }
	} = getConnection();

	onMount(() => setMainContent(main));
	onMount(() => pushTopContent(top));

	const searchString: Writable<string> = writable('');
	let newUserDialog: boolean = $state(false);

	let options: [user: UserResource, sourceElement: HTMLElement] | null = $state(null as never);
	let suspendConfirmation: [user: UserResource, suspended: boolean] | null = $state(null as never);
</script>

{#snippet top()}
	<div class="top-bar">
		<div class="title"><h2>Users</h2></div>

		<div class="search-box">
			<Input
				name="Search"
				type="text"
				placeholder="Search"
				icon="fa-solid fa-magnifying-glass"
				value={searchString}
			/>
		</div>

		<div class="actions">
			{#snippet actionContainer(view: Snippet)}
				<div class="action">{@render view()}</div>
			{/snippet}

			<Button
				container={actionContainer}
				onClick={() => {
					newUserDialog = true;
				}}
				buttonClass="transparent"
				outline={false}
			>
				<i class="action-icon fa-solid fa-plus"></i>
				<p class="action-label">New User</p>
			</Button>
		</div>
	</div>
{/snippet}

{#snippet main()}
	{#await listUsers({ searchString: $searchString }) then a}
		<div class="user-grid">
			{#each a as user}
				<div class="user">
					<div class="user-icon">
						<img src="/favicon.svg" alt="profile" />
					</div>

					<div class="user-name" class:suspended={user.isSuspended}>
						<User {user} />
						{#if user.isSuspended}
							(Suspended)
						{/if}
					</div>
					<div class="user-actions">
						<Button
							buttonClass="transparent"
							outline={false}
							onClick={(event) => {
								options = [user, event.currentTarget as HTMLElement];
							}}
						>
							<i class="fa-solid fa-ellipsis-vertical"></i>
						</Button>
					</div>
				</div>
			{/each}
		</div>
	{/await}
{/snippet}

{#if newUserDialog}
	<NewUser
		onDismiss={() => {
			newUserDialog = false;
		}}
	/>
{/if}

{#if options != null}
	{@const [user, sourceElement] = options}
	<UserOptions
		{user}
		{sourceElement}
		onDismiss={() => {
			options = null;
		}}
		onSuspend={(user, suspended) => {
			suspendConfirmation = [user, suspended];
		}}
	></UserOptions>
{/if}

{#if suspendConfirmation != null}
	{@const [user, suspended] = suspendConfirmation}

	<SuspendConfirmation
		{user}
		{suspended}
		onConfirm={async () => {
			await setSuspend(user.id, suspended);

			suspendConfirmation = null;
		}}
		onDismiss={() => {
			suspendConfirmation = null;
		}}
	/>
{/if}

<style lang="scss">
	div.top-bar {
		flex-grow: 1;

		display: flex;
		flex-direction: row;

		gap: 16px;

		align-items: center;
	}

	div.title {
		flex-grow: 1;
	}

	div.actions {
		display: flex;
		flex-direction: row;
	}

	div.action {
		display: flex;
		flex-direction: column;

		padding: 4px;
	}

	i.action-icon {
		font-size: 1.2em;
	}

	div.user-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(256px, 1fr));
		gap: 16px;
	}

	div.user {
		display: flex;
		flex-direction: row;
		gap: 8px;

		align-items: center;

		> div.user-icon {
			display: flex;
			flex-direction: column;

			align-items: center;
			justify-content: center;

			width: 64px;
			height: 64px;

			> img {
				width: 64px;
				height: 64px;
			}
		}

		> div.user-name {
			flex-grow: 1;
		}

		> div.user-name.suspended {
			text-decoration: line-through;
		}
	}
</style>
