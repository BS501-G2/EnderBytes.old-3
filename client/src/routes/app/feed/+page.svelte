<script lang="ts" module>
</script>

<script lang="ts">
	import { Button, Title, ViewMode, viewMode } from '@rizzzi/svelte-commons';
	import { getContext, onMount, type Snippet } from 'svelte';
	import { type DashboardContext, DashboardContextName } from '../dashboard';
	import { getConnection } from '$lib/client/client';
	import { goto } from '$app/navigation';
	import { type FileResource, type FileAccessResource } from '@rizzzi/enderdrive-lib/shared';

	const { setMainContent } = getContext<DashboardContext>(DashboardContextName);
	const {
		serverFunctions: { listSharedFiles }
	} = getConnection();

	onMount(() => setMainContent(main as Snippet));
</script>

<Title title="Feed" />

{#snippet main()}
	<div
		class="page"
		class:desktop={$viewMode & ViewMode.Desktop}
		class:mobile={$viewMode & ViewMode.Mobile}
	>
		<div
			class="card"
			class:desktop={$viewMode & ViewMode.Desktop}
			class:mobile={$viewMode & ViewMode.Mobile}
		>
			<div class="head">
				<h2 class="title">Shared Files</h2>

				<Button
					buttonClass={$viewMode & ViewMode.Desktop ? 'primary' : 'transparent'}
					onClick={() => {
						goto('/app/shared');
					}}
				>
					See More
				</Button>
			</div>

			<div class="body">
				{#await (async () => {
					const users: FileAccessResource[][] = [];

					for (const user of await listSharedFiles()) {
						if (users[0] == null || users[0][0].granterUserId !== user.granterUserId) {
							users.unshift([user]);
							continue;
						}

						users[0].unshift(user);
					}

					return users;
				})()}{/await}
			</div>
		</div>

		<a href="feed/old">Go to Old Feed</a>
	</div>
	{#if $viewMode & ViewMode.Mobile}
		<div class="divider"></div>
	{/if}
{/snippet}

<style lang="scss">
	div.page {
		display: flex;
		flex-direction: column;
	}

	div.divider {
		min-height: 1px;
		max-height: 1px;

		background-color: var(--primaryContainer);
		margin: 8px;
	}

	div.page.mobile {
		padding: 8px;
		gap: 8px;
	}

	div.card {
		display: flex;
		flex-direction: column;

		gap: 8px;

		> div.head {
			display: flex;

			> h2.title {
				flex-grow: 1;
			}
		}
	}

	div.card.mobile {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);
	}

	div.card.desktop {
		margin: 16px;

		> div.head {
			padding: 0 8px;
		}

		> div.body {
			padding: 8px;
			border-radius: 8px;

			background-color: var(--backgroundVariant);
			color: var(--onBackgroundVariant);
		}
	}
</style>
