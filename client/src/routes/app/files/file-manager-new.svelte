<script lang="ts" module>
	export interface FileManagerNewProps {
		element: HTMLElement;

		presetFiles?: File[];

		onDismiss: () => void;

		uploadNewFiles: (files: File[]) => void;
		createNewFolder: (name: string) => void;
	}
</script>

<script lang="ts">
	import { byteUnit } from '@rizzzi/enderdrive-lib/shared';

	import {
		Button,
		Dialog,
		Input,
		Overlay,
		ViewMode,
		viewMode
	} from '@rizzzi/svelte-commons';
	import { onMount, type Snippet } from 'svelte';
	import { writable, type Writable } from 'svelte/store';
	import { fly } from 'svelte/transition';

	const { element, uploadNewFiles, createNewFolder, onDismiss, presetFiles }: FileManagerNewProps =
		$props();

	type Action = [action: () => void, label: string];

	const tabs: {
		name: string;
		icon: string;
		options: Action[];
	}[] = [
		{
			name: 'New File',
			icon: 'fa-solid fa-file',
			options: [
				[() => uploadNewFiles($files), 'Upload'],
				[onDismiss, 'Cancel']
			]
		},
		{
			name: 'New Folder',
			icon: 'fa-solid fa-folder',
			options: [
				[() => createNewFolder($folder), 'Create'],
				[onDismiss, 'Cancel']
			]
		}
	];

	let fileElement: HTMLInputElement = $state(null as never);
	const files: Writable<File[]> = writable([]);
	const folder: Writable<string> = writable('');

	const currentTabIndex: Writable<number> = writable(0);

	onMount(() => {
		if (presetFiles) {
			files.set(presetFiles);
		}
	});
</script>

{#snippet dialogHead()}
	<div class="tabs">
		{#each tabs as tab, index}
			<button
				class="tab"
				class:current={$currentTabIndex === index}
				onclick={() => ($currentTabIndex = index)}
			>
				<div>
					<i class={tab.icon}></i>
					<p>{tab.name}</p>
				</div>
			</button>
		{/each}
	</div>
{/snippet}

{#snippet dialogBody()}
	{@const current = tabs[$currentTabIndex]}

	<div class="body">
		{#if current === tabs[0]}
			{#if $files.length === 0}
				<p class="file-notice">
					Uploaded files will be stored inside the current folder. {#if $viewMode & ViewMode.Desktop}
						Alternatively, you can drag the files into the folder view to upload files quickly.
					{/if}
				</p>
			{:else}
				<div class="list">
					{#each $files as file}
						<div class="row">
							<p class="file-name">{file.name}</p>
							<p class="file-size">{byteUnit(file.size)}</p>
						</div>
					{/each}
				</div>
			{/if}

			<input
				bind:this={fileElement}
				hidden
				type="file"
				multiple
				onchange={({ currentTarget }) => ($files = Array.from(currentTarget.files ?? []))}
			/>

			<Button
				buttonClass="transparent"
				container={buttonContainer}
				onClick={() => fileElement?.click()}
			>
				<p>Select Files</p>
			</Button>
		{:else if current === tabs[1]}
			<Input name="Folder Name" type="text" value={folder} />
		{/if}
	</div>
{/snippet}

{#snippet dialogActions()}
	<div class="actions">
		{#each tabs as tab, index}
			{#if $currentTabIndex === index}
				{#each tab.options as [action, name], index}
					<Button
						buttonClass={index === 0 ? 'primary' : 'transparent'}
						container={buttonContainer}
						onClick={action}
					>
						<p>{name}</p>
					</Button>
				{/each}
			{/if}
		{/each}
	</div>
{/snippet}

{#if $viewMode & ViewMode.Desktop}
	<Overlay
		{onDismiss}
		position={['offset', element.offsetLeft, element.offsetTop + element.offsetHeight]}
	>
		<div
			class="desktop dialog"
			in:fly|global={{ duration: 250, y: -16 }}
			out:fly|global={{ duration: 250, y: -16 }}
		>
			{@render dialogHead()}
			{@render dialogBody()}
			{@render dialogActions()}
		</div>
	</Overlay>
{:else if $viewMode & ViewMode.Mobile}
	<Dialog {onDismiss}>
		{#snippet head()}
			{@render dialogHead()}
		{/snippet}

		{#snippet body()}
			<div class="mobile dialog">
				{@render dialogBody()}
			</div>
		{/snippet}

		{#snippet actions()}
			{@render dialogActions()}
		{/snippet}
	</Dialog>
{/if}

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">
		{@render view()}
	</div>
{/snippet}

<style lang="scss">
	div.button-container {
		margin: 8px;
	}

	div.dialog {
		display: flex;
		flex-direction: column;

		gap: 8px;
		border-radius: 8px;
	}

	div.dialog.desktop {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		padding: 16px;

		min-width: 320px;
		min-height: 256px;
		max-width: 320px;
		max-height: 256px;

		box-shadow: 2px 2px 8px var(--shadow);
	}

	div.dialog.mobile {
		min-width: 100%;
		min-height: 100%;
	}

	div.tabs {
		display: flex;
		flex-direction: row;

		gap: 8px;

		> button.tab {
			flex-grow: 1;
			flex-basis: 0px;

			display: flex;

			background-color: unset;
			color: inherit;
			border: none;

			transition-property: all;
			transition-duration: 200ms;

			justify-content: center;

			border-radius: 8px;

			> div {
				flex-grow: 1;

				border-bottom: solid 2px transparent;

				display: flex;
				flex-direction: row;

				justify-content: center;

				padding: 8px;
				gap: 8px;
			}
		}

		> button.tab.current {
			> div {
				border-bottom-color: var(--primary);
			}
		}

		> button.tab:hover {
			background-color: var(--background);
			color: var(--onBackground);

			cursor: pointer;
		}

		> button.tab:active {
			background-color: var(--primary);
			color: var(--onPrimary);
		}
	}

	div.body {
		display: flex;
		flex-direction: column;

		min-width: 0px;
		min-height: 0px;

		flex-grow: 1;
		gap: 8px;

		> p.file-notice {
			flex-grow: 1;

			min-height: 0px;
		}

		> div.list {
			overflow: hidden auto;

			flex-grow: 1;

			min-height: 0px;

			> div.row {
				display: flex;
				flex-direction: row;

				align-items: center;

				gap: 8px;
				min-width: 0px;

				> p.file-name {
					flex-grow: 1;

					font-weight: bold;

					max-width: 100%;

					text-overflow: ellipsis;
					text-wrap: nowrap;
					overflow: hidden;

					max-lines: 1;
				}

				> p.file-size {
					min-width: 96px;
					max-width: 96px;

					font-style: italic;

					text-wrap: nowrap;
				}
			}
		}
	}

	div.actions {
		display: flex;
		flex-direction: row;

		justify-content: safe end;

		gap: 8px;
	}
</style>
