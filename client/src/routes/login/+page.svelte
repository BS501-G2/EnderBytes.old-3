<script lang="ts">
	import {
		ResponsiveLayout,
		ViewMode,
		viewMode,
		Input,
		Button,
		Dialog
	} from '@rizzzi/svelte-commons';
	import { type Writable, writable } from 'svelte/store';
	import { type Snippet } from 'svelte';
	import { authenticateWithPassword } from '$lib/client/client';
	import { goto } from '$app/navigation';

	const {}: {} = $props();

	const username: Writable<string> = writable('');
	const password: Writable<string> = writable('');

	const errorStore: Writable<Error | null> = writable(null);

	let loginButton: () => void = $state(null as never);

	let passFocus: () => void = $state(null as never);
</script>

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">{@render view()}</div>
{/snippet}

{#if $errorStore != null}
	<Dialog
		onDismiss={() => {
			$errorStore = null;
		}}
		dialogClass="error"
	>
		{#snippet head()}
			<h2>Error</h2>
		{/snippet}
		{#snippet body()}
			{$errorStore!.message}
		{/snippet}
		{#snippet actions()}
			<Button
				onClick={() => {
					$errorStore = null;
				}}
				container={buttonContainer}
			>
				Close
			</Button>
		{/snippet}
	</Dialog>
{/if}

<div class="page">
	<div class="top-bar"></div>

	<div class="container" class:mobile={$viewMode & ViewMode.Mobile}>
		{#if $viewMode & ViewMode.Desktop}
			<div class="banner"></div>
		{/if}

		<div class="form" class:mobile={$viewMode & ViewMode.Mobile}>
			<div class="site-logo">
				<img src="/favicon.svg" alt="logo" />
				<h2>EnderDrive</h2>
			</div>
			<div class="fields">
				<Input
					type="text"
					icon="fa-circle-user fa-solid"
					name="Username"
					value={username}
					onSubmit={passFocus}
				/>
				<Input
					type="password"
					icon="fa-key fa-solid"
					name="Password"
					value={password}
					bind:focus={passFocus}
					onSubmit={loginButton}
				/>
				<Button
					bind:click={loginButton}
					buttonClass="primary"
					onClick={async () => {
						try {
							await authenticateWithPassword($username, $password);
							await goto('/app');
						} catch (error: any) {
							$errorStore = error;
						}
					}}
					container={buttonContainer}
				>
					Login
				</Button>
			</div>
		</div>
	</div>
</div>

<style lang="scss">
	:global(body) {
		display: flex;
		flex-direction: row;
		justify-content: safe center;
	}

	div.page {
		display: flex;
		flex-direction: column;
		align-items: center;

		min-width: 100vw;
		max-width: 100vw;

		min-height: 100vh;
		max-height: 100vh;
	}

	div.top-bar {
		min-height: env(titlebar-area-height);

		background-color: var(--primaryContainer);
	}

	div.container {
		-webkit-app-region: no-drag;

		max-width: min(1280px, 100%);
		width: 100%;
		min-width: 0px;
		box-sizing: border-box;

		flex-grow: 1;
		display: flex;
		flex-direction: row;

		align-items: stretch;

		padding: 16px;
		gap: 16px;

		> div.banner,
		> div.form {
			background-color: var(--backgroundVariant);
			color: var(--onBackgroundVariant);

			padding: 16px;
			border-radius: 16px;
			box-sizing: border-box;
		}

		> div.banner {
			flex-grow: 1;
		}

		> div.form {
			min-width: 320px;
			max-width: 320px;

			display: flex;
			flex-direction: column;
			gap: 8px;

			justify-content: safe center;

			> div.fields {
				display: flex;
				flex-direction: column;
				gap: 16px;
			}

			> div.site-logo {
				display: flex;
				flex-direction: row;

				gap: 16px;
				padding: 16px;

				justify-content: safe center;
				align-items: center;

				> h2 {
					font-weight: lighter;
				}

				> img {
					width: 64px;
					height: 64px;
				}
			}
		}

		> div.form.mobile {
			min-width: 0px;
			max-width: unset;
			flex-grow: 1;
		}
	}

	div.container.mobile {
		padding: unset;

		> div.form {
			border-radius: 0px;
		}
	}

	div.button-container {
		padding: 8px;
	}
</style>
