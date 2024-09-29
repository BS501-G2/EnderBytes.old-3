<script lang="ts">
	import { goto } from '$app/navigation';
	import { getConnection } from '$lib/client/client';
	import User from '$lib/client/user.svelte';
	import type { FileLogResource } from '@rizzzi/enderdrive-lib/shared';
	import { LoadingSpinner } from '@rizzzi/svelte-commons';
	import type { Snippet } from 'svelte';

	const {
		log,
		'include-file': includeFile = false,
		hoverControls = []
	}: {
		log: FileLogResource;
		'include-file'?: boolean;
		hoverControls?: Snippet[];
	} = $props();

	const {
		serverFunctions: { adminGetFile }
	} = getConnection();

	let isHovered: boolean = $state(false);
	let actionElement: HTMLDivElement = $state(null as never);
</script>

<div
	bind:this={actionElement}
	role="listitem"
	class="action"
	onmouseenter={(event) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.target === actionElement) {
			isHovered = true;
		}
	}}
	onmouseleave={(event) => {
		event.preventDefault();
		event.stopPropagation();
		if (event.target === actionElement) {
			isHovered = false;
		}
	}}
>
	<div class="side">
		<img src="/favicon.svg" alt="logo" />
	</div>

	<div class="main">
		<div class="top">
			<p class="message">
				<User userId={log.actorUserId} /> performed <b>{log.type}</b> action.
			</p>

			<div class="actions" style={isHovered ? 'opacity: 1' : 'opacity: 0'}>
				{#each hoverControls as control}
					{@render control()}
				{/each}
			</div>
		</div>

		{#if includeFile}
			<button class="file" onclick={() => goto(`/app/files?fileId=${log.targetFileId}`)}>
				{#await adminGetFile(log.targetFileId)}
					<LoadingSpinner size="1em" />
				{:then file}
					{#if file.type === 'folder'}
						<i class="fa-solid fa-folder"></i>
					{:else if file.type === 'file'}
						<i class="fa-solid fa-file"></i>
					{/if}

					<p>{file.name}</p>
				{/await}
			</button>
		{/if}
	</div>
</div>

<style lang="scss">
	div.action {
		display: flex;
		flex-direction: row;

		padding: 0px 16px;
		gap: 8px;

		> div.side {
			img[alt='logo'] {
				width: 32px;
				height: 32px;
			}
		}

		> div.main {
			flex-grow: 1;

			display: flex;
			flex-direction: column;

			gap: 8px;

			> div.top {
				display: flex;
				flex-direction: row;
				align-items: center;
				justify-content: space-between;

				> p.message {
					flex-grow: 1;
				}
			}

			> button.file {
				display: flex;
				flex-direction: row;

				// border: solid 1px var(--shadow);
				background-color: var(--background);
				color: var(--onBackground);
				border: none;

				border-radius: 8px;
				gap: 8px;
				padding: 16px;

				align-items: center;

				> i {
					font-size: 24px;
				}
			}

			> button.file:hover {
				// background-color: var(--backgroundVariant);
				// color: var(--onBackgroundVariant);

				cursor: pointer;

				> p {
					text-decoration: underline;
				}
			}
		}
	}
</style>
