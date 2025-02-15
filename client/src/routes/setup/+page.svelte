<script lang="ts">
	import {
		Awaiter,
		Tab,
		Input,
		Dialog,
		Button,
		type TabItem,
		createTabId,
		type SetTabFunction
	} from '@rizzzi/svelte-commons';

	import { type Writable, writable } from 'svelte/store';

	import { goto } from '$app/navigation';
	import { getConnection } from '$lib/client/client';
	import type { Snippet } from 'svelte';

	const tabs: TabItem[] = [
		{
			name: 'Login Credentials',
			view: loginCredentialsTab as Snippet<[setTab: SetTabFunction, tab: TabItem<{}>]>
		},
		{
			name: 'Profile',
			view: profileTab as Snippet<[setTab: SetTabFunction, tab: TabItem<{}>]>
		}
	];

	const tabId = createTabId(tabs);

	const username: Writable<string> = writable('');
	const password: Writable<string> = writable('');
	const confirmPassword: Writable<string> = writable('');
	const firstName: Writable<string> = writable('');
	const middleName: Writable<string> = writable('');
	const lastName: Writable<string> = writable('');
</script>

{#snippet loginCredentialsTab(setTab: SetTabFunction, tab: TabItem<{}>)}
	<p>Put in your login credentials</p>

	<div class="input-row">
		<Input type="text" name="Username" value={username} icon="fa fa-user" />
	</div>
	<div class="input-row">
		<div class="input-row-division">
			<Input type="password" name="Password" value={password} icon="fa fa-lock" />
		</div>
		<div class="input-row-division">
			<Input type="password" name="Confirm Password" value={confirmPassword} icon="fa fa-lock" />
		</div>
	</div>
{/snippet}

{#snippet profileTab(setTab: SetTabFunction, tab: TabItem<{}>)}
	<p>Put in your profile information</p>

	<div class="input-row">
		<Input type="text" name="First Name" value={firstName} icon="fa fa-user" />
	</div>

	<div class="input-row">
		<Input type="text" name="Middle Name" value={middleName} icon="fa fa-user" />
	</div>

	<div class="input-row">
		<Input type="text" name="Last Name" value={lastName} icon="fa fa-user" />
	</div>
{/snippet}

<Dialog
	onDismiss={() => {
		goto('/admin', { replaceState: false });

		setTimeout(() => {
			location.reload();
		}, 100);
	}}
>
	{#snippet head()}
		<h2>Administrator Account Setup</h2>
	{/snippet}

	{#snippet body()}
		<Tab id={tabId}>
			{#snippet view(view: Snippet)}
				<div class="tab-view">
					{@render view()}
				</div>
			{/snippet}
		</Tab>
	{/snippet}

	{#snippet actions()}
		<Tab id={tabId}>
			{#snippet view()}{/snippet}
			{#snippet host(tabs: TabItem<{}>[], currentIndex: number, setTab: SetTabFunction)}
				<Button
					onClick={() => setTab(currentIndex - 1)}
					buttonClass="background"
					enabled={currentIndex > 0}
				>
					<div class="button">Previous</div>
				</Button>

				<Button
					onClick={async () => {
						if (currentIndex !== tabs.length - 1) {
							setTab(currentIndex + 1);
						} else {
							getConnection().serverFunctions.register(
								$username,
								$firstName,
								$middleName || null,
								$lastName,
								$password
							);

							await goto('/admin');
						}
					}}
				>
					<div class="button">
						{#if currentIndex !== tabs.length - 1}
							Next
						{:else}
							Submit
						{/if}
					</div>
				</Button>
			{/snippet}
		</Tab>
	{/snippet}
</Dialog>

<style lang="scss">
	div.button {
		padding: 8px;
	}

	div.tab-view {
		min-width: min(100dvw, 512px);

		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	div.input-row {
		display: flex;
		flex-direction: row;
		align-items: center;
		gap: 8px;

		> :global(*) {
			flex-grow: 1;
		}
	}

	div.input-row-division {
		flex-grow: 1;

		min-width: 0px;
	}
</style>
