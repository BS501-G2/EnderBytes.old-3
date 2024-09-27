<script lang="ts">
	import { Button, LoadingSpinner, viewMode, ViewMode } from '@rizzzi/svelte-commons';
	import { getContext, type Snippet } from 'svelte';
	import {
		FileManagerContextName,
		type FileManagerProps,
		FileManagerPropsName,
		type FileManagerContext,
		type SourceEvent
	} from './file-manager.svelte';
	import FileManagerSeparator from './file-manager-separator.svelte';
	import { getConnection2 } from '$lib/client/client';

	const { onFileId } = getContext<FileManagerProps>(FileManagerPropsName);
	const { resolved, addressBarMenu } = getContext<FileManagerContext>(FileManagerContextName);

	const {
		serverFunctions: { getFile }
	} = getConnection2();
</script>

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">{@render view()}</div>
{/snippet}

<div
	class="address-bar"
	class:mobile={$viewMode & ViewMode.Mobile}
	class:desktop={$viewMode & ViewMode.Desktop}
>
	{#if $resolved.status === 'loading'}
		<div class="address-bar-loading">
			<LoadingSpinner size="1.2em" />
			<p>Loading...</p>
		</div>
	{:else if $resolved.status === 'success' && $resolved.page === 'files'}
		{@const [root, ...filePathChain] = $resolved.filePathChain}

		{@const isLocal = root == null || root.ownerUserId === $resolved.me.id}

		{#snippet button(icon: string, name: string)}
			<i class="fa-solid {icon}"></i>
			{#if $viewMode & ViewMode.Desktop}
				<p class="address-bar-root-button">{name}</p>
			{/if}
		{/snippet}

		<Button
			onClick={(event: SourceEvent) => onFileId(event, null)}
			buttonClass={isLocal ? 'transparent' : 'primary'}
			outline={false}
			container={buttonContainer}
		>
			{#if isLocal}
				{@render button('fa-regular fa-folder-open', 'My Files')}
			{:else}
				{@render button('fa-solid fa-user-group', root.name)}
			{/if}
		</Button>

		{#if filePathChain.length > 0}
			<FileManagerSeparator orientation="vertical" with-margin />
		{/if}

		<div class="address-bar-path-chain">
			{#each filePathChain as file}
				<div class="address-bar-entry" class:desktop={$viewMode & ViewMode.Desktop}>
					{#if $viewMode & ViewMode.Desktop}
						<button
							class="arrow"
							onclick={async (event) => {
								$addressBarMenu = [
									event.currentTarget as HTMLElement,
									await getFile(file.parentFileId)
								];
							}}
						>
							<i class="fa-solid fa-chevron-right"></i>
						</button>
					{:else}
						<div class="arrow">
							<i class="fa-solid fa-caret-right"></i>
						</div>
					{/if}

					<button
						class="file"
						class:mobile={$viewMode & ViewMode.Mobile}
						onclick={(event) => onFileId(event, file.id)}
					>
						{file.name}
					</button>
				</div>
			{/each}
		</div>
	{/if}
</div>

{#if $viewMode & ViewMode.Mobile}
	<FileManagerSeparator orientation="horizontal" />
{/if}

<style lang="scss">
	div.button-container {
		display: flex;
		flex-direction: row;

		align-items: center;

		padding: 4px 8px;
		gap: 4px;
	}

	div.address-bar {
		display: flex;
		flex-direction: row;

		min-height: calc(24px + 1em);
		line-height: 1em;

		min-width: 0px;

		> div.address-bar-path-chain {
			display: flex;
			flex-direction: row;
			flex-grow: 1;

			// align-items: center;

			overflow: auto hidden;

			min-width: 0px;

			padding: 0px 8px;
		}

		> div.address-bar-loading {
			display: flex;
			flex-direction: row;

			align-items: center;

			gap: 8px;
			padding: 0px 8px;
		}
	}

	div.address-bar.desktop {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		border-radius: 8px;
	}

	p.address-bar-root-button {
		text-wrap: nowrap;
		max-lines: 1;
	}

	div.address-bar-entry {
		display: flex;
		flex-direction: row;

		// padding: 4px;
		margin: 4px 0px;

		border-radius: 4px;

		> button.file,
		> button.arrow,
		> div.arrow {
			padding: 0px 8px;
			background-color: unset;
			color: inherit;
			border: none;
		}

		> button.arrow,
		> div.arrow {
			display: flex;
			flex-direction: row;

			align-items: center;

			border-radius: 4px 0px 0px 4px;
		}

		> button.arrow:hover {
			background-color: var(--primaryContainer);
			color: var(--onPrimaryContainer);

			cursor: pointer;
		}

		> button.file {
			max-lines: 1;

			text-wrap: nowrap;
			overflow: hidden;
			text-overflow: ellipsis;

			max-width: 128px;

			border-radius: 0px 4px 4px 0px;
		}

		> button.file.mobile {
			border-radius: 4px;
		}

		> button.file:hover {
			background-color: var(--primaryContainer);
			color: var(--onPrimaryContainer);

			cursor: pointer;
		}
	}

	div.address-bar-entry.desktop:hover {
		background-color: var(--background);
		color: var(--onBackground);

		cursor: pointer;
	}
</style>
