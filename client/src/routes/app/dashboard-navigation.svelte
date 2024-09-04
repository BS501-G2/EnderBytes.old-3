<script lang="ts">
	import { goto } from '$app/navigation';

	import { page } from '$app/stores';
	import { getConnection } from '$lib/client/client';
	import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
	import { getContext, onMount } from 'svelte';
	import { type DashboardContext, DashboardContextName } from './dashboard';
	import type { UserResource } from '@rizzzi/enderdrive-lib/server';
	import { serializeUserRole } from '@rizzzi/enderdrive-lib/shared';

	const { isWidthLimited } = getContext<DashboardContext>(DashboardContextName);

	function updatelimitedState() {
		const newValue = window.innerWidth < 1280;

		if ($isWidthLimited !== newValue) {
			$isWidthLimited = newValue;
		}
	}

	const {
		serverFunctions: { whoAmI }
	} = getConnection();

	let userPromise: Promise<UserResource | null> | null = $state(null);

	onMount(() => updatelimitedState());

	type IconGenerator = (selected: boolean) => string;
	type NavigationCallback = () => void;
</script>

<svelte:window onresize={updatelimitedState} />

{#snippet navigationButton(
	name: string,
	icon: IconGenerator,
	selected: boolean,
	onclick: NavigationCallback
)}
	<button
		class="navigation-entry"
		class:selected
		{onclick}
		class:desktop={$viewMode & ViewMode.Desktop}
		class:mobile={$viewMode & ViewMode.Mobile}
		class:limited={$isWidthLimited}
	>
		<div class="icon">
			<i class={icon(selected)}></i>
		</div>
		<p class="label">{name}</p>
	</button>
{/snippet}

<div
	class="navigation"
	class:desktop={$viewMode & ViewMode.Desktop}
	class:mobile={$viewMode & ViewMode.Mobile}
	class:limited={$isWidthLimited}
>
	{#key $page}
		{@render navigationButton(
			'Feed',
			(selected) => `fa-${selected ? 'solid' : 'regular'} fa-newspaper`,
			$page.url.pathname === '/app/feed',
			() => goto('/app/feed')
		)}
		{@render navigationButton(
			'Files',
			(selected) => `fa-${selected ? 'solid' : 'regular'} fa-folder`,
			$viewMode & ViewMode.Desktop
				? $page.url.pathname === '/app/files'
				: $page.url.pathname === '/app/files' ||
						$page.url.pathname === '/app/shared' ||
						$page.url.pathname === '/app/trash' ||
						$page.url.pathname === '/app/starred',
			() => goto('/app/files')
		)}
		{#if $viewMode & ViewMode.Desktop}
			{@render navigationButton(
				'Starred',
				(selected) => `fa-${selected ? 'solid' : 'regular'} fa-star`,
				$page.url.pathname === '/app/starred',
				() => goto('/app/starred')
			)}

			{@render navigationButton(
				'Shared',
				(selected) => `fa-${selected ? 'solid' : 'regular'} fa-share-from-square`,
				$page.url.pathname === '/app/shared',
				() => goto('/app/shared')
			)}

			{@render navigationButton(
				'Trash',
				(selected) => `fa-${selected ? 'solid' : 'regular'} fa-trash-can`,
				$page.url.pathname === '/app/trash',
				() => goto('/app/trash')
			)}
		{/if}

		{@render navigationButton(
			'Profile',
			(selected) => `fa-${selected ? 'solid' : 'regular'} fa-user`,
			$page.url.pathname === '/app/users' && $page.url.searchParams.get('id') === '!me',
			() => goto('/app/users?id=!me')
		)}

		{#if $viewMode & ViewMode.Desktop}
			{#await (userPromise ??= whoAmI()) then user}
				{#if user != null && user.role >= serializeUserRole('SiteAdmin')}
					{@render navigationButton(
						'Admin',
						(selected) => `fa-${selected ? 'solid' : 'regular'} fa-user-shield`,
						$page.url.pathname.startsWith('/app/admin'),
						() => goto('/app/admin')
					)}
				{/if}
			{/await}
		{/if}
	{/key}
</div>

<style lang="scss">
	div.navigation {
		display: flex;

		min-width: 0;
		min-height: 128px;
	}

	div.navigation.desktop {
		flex-grow: 1;

		flex-direction: column;

		gap: 8px;

		min-width: 256px;
		max-width: 256px;

		overflow: hidden auto;
	}

	div.navigation.desktop.limited {
		min-width: unset;
		max-width: unset;
	}

	div.navigation.mobile {
		flex-grow: 1;

		flex-direction: row;

		min-height: calc(40px + 1em);

		overflow: auto hidden;
	}

	button.navigation-entry {
		-webkit-app-region: no-drag;

		display: flex;

		align-items: center;
		flex-direction: column;

		gap: 4px;
		padding: 4px;

		overflow: auto hidden;

		background-color: unset;
		color: inherit;

		border: none;

		> p.label {
			line-height: 1em;
		}
	}

	button.navigation-entry.desktop {
		cursor: pointer;
		padding: 8px;

		flex-direction: row;
		justify-content: safe start;

		border-radius: 8px;

		> div.icon {
			// flex-grow: 1;

			display: flex;

			align-items: center;
			justify-content: center;

			min-width: 32px;
			max-width: 32px;

			font-size: 1em;
		}

		> p.label {
			flex-grow: 1;
			font-size: 1.2em;

			text-align: start;
		}
	}

	button.navigation-entry.desktop.limited {
		min-width: 48px;
		min-height: 64px;

		flex-direction: column;
		align-items: center;
		padding: 4px;

		> div.icon {
			flex-grow: 1;
			font-size: 1.5em;
		}

		> p.label {
			flex-grow: 0.5;
			font-size: 0.75em;
		}
	}

	button.navigation-entry.mobile {
		flex-grow: 1;

		justify-content: center;

		> div.icon {
			font-size: 1.5em;
		}
	}

	button.navigation-entry.selected {
		background-color: var(--primary);
		color: var(--onPrimary);

		font-weight: bolder;
	}

	button.navigation-entry.mobile.selected {
		background-color: unset;
		color: inherit;
	}
</style>
