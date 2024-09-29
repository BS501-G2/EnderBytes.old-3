<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import {
		type FileManagerContext,
		FileManagerContextName,
		type FileManagerProps,
		FileManagerPropsName
	} from './file-manager.svelte';
	import { Button, Dialog, Overlay, ViewMode, viewMode } from '@rizzzi/svelte-commons';
	import { fly } from 'svelte/transition';
	import { type FileManagerViewMode } from './file-manager-folder-list';

	const {} = getContext<FileManagerProps>(FileManagerPropsName);
	const { resolved, showSideBar, listViewMode, refreshKey } =
		getContext<FileManagerContext>(FileManagerContextName);

	const { element, onDismiss }: { element: HTMLElement; onDismiss: () => void } = $props();

	let sort: string = $state('name');
</script>

{#snippet buttonContainer(view: Snippet)}
	<div class="button-container">
		{@render view()}
	</div>
{/snippet}

{#snippet layout()}
	{#if $viewMode & ViewMode.Desktop}
		<div class="row">
			<p class="label">Sidebar</p>
			{#each [true, false] as value}
				{#if $showSideBar == value}
					<Button
						container={buttonContainer as Snippet}
						onClick={() => {
							if ($showSideBar == value) {
								$showSideBar = !value;
							}
						}}
					>
						<i class="fa-solid fa-{value ? 'eye' : 'eye-slash'}"></i>
						<p>{value ? 'Visible' : 'Hidden'}</p>
					</Button>
				{/if}
			{/each}
		</div>
	{/if}

	{#if $resolved.status === 'success' && !($resolved.page === 'files' && $resolved.type === 'file')}
		<div class="row">
			<p class="label">Sort</p>

			{#snippet button(name: string, value: string, icon: string)}
				<Button
					container={buttonContainer as Snippet}
					buttonClass={value === sort ? 'primary' : 'transparent'}
					onClick={() => {
						sort = value;
						$refreshKey++;
					}}
				>
					<i class={icon}></i>
					<p>
						{name}
					</p>
				</Button>
			{/snippet}

			{@render button('Name', 'name', 'fa-regular fa-rectangle-list')}
			{@render button('Size', 'size', 'fa-regular fa-rectangle-list')}
			{@render button('Date', 'date', 'fa-regular fa-rectangle-list')}
		</div>

		<div class="row">
			<p class="label">List Mode</p>
			{#each ['list', 'grid'] as FileManagerViewMode[] as value}
				<Button
					container={buttonContainer as Snippet}
					buttonClass={value === $listViewMode ? 'primary' : 'transparent'}
					onClick={() => {
						$listViewMode = value;
					}}
				>
					{#if value === 'grid'}
						<i class="fa-solid fa-th-large"></i>
						<p>Grid</p>
					{:else if value === 'list'}
						<i class="fa-solid fa-list"></i>
						<p>List</p>
					{/if}
				</Button>
			{/each}
		</div>
	{/if}
{/snippet}

{#if $viewMode & ViewMode.Desktop}
	<Overlay
		position={[
			'offset',
			-(window.innerWidth - element.offsetLeft - element.offsetWidth),
			element.offsetTop + element.offsetHeight
		]}
		{onDismiss}
	>
		<div transition:fly|global={{ duration: 250, y: -16 }} class="desktop layout">
			{@render layout()}
		</div>
	</Overlay>
{:else if $viewMode & ViewMode.Mobile}
	<Dialog {onDismiss}>
		{#snippet head()}{/snippet}
		{#snippet body()}
			<div class="mobile layout">
				{@render layout()}
			</div>
		{/snippet}
		{#snippet actions()}{/snippet}
	</Dialog>
{/if}

<style lang="scss">
	div.button-container {
		margin: 8px;

		display: flex;
		flex-direction: row;
		flex-wrap: wrap;
		gap: 8px;

		align-items: center;
	}

	div.layout {
		display: flex;
		flex-direction: column;

		gap: 8px;
	}

	div.desktop.layout {
		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		padding: 16px;
		border-radius: 8px;
		box-shadow: var(--shadow) 2px 2px 8px;

		min-width: 128px;
	}

	div.row {
		display: flex;
		flex-direction: row;
		flex-wrap: wrap;

		gap: 8px;

		align-items: center;

		min-width: 0px;
		min-height: 0px;

		> p.label {
			flex-grow: 1;
		}
	}
</style>
