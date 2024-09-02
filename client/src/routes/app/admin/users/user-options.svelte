<script lang="ts" module>
	type ContextMenuCallback = () => void;
</script>

<script lang="ts">
	import type { UserResource } from '@rizzzi/enderdrive-lib/server';
	import { Overlay } from '@rizzzi/svelte-commons';
	import { fade } from 'svelte/transition';

	const {
		user,
		sourceElement,
		onDismiss,
		onSuspend
	}: {
		user: UserResource;
		sourceElement: HTMLElement;
		onDismiss: () => void;
		onSuspend: (user: UserResource, suspended: boolean) => void;
	} = $props();
</script>

<Overlay
	position={[
		'offset',
		Math.min(sourceElement.offsetLeft, window.innerWidth - 256),
		sourceElement.offsetTop + sourceElement.offsetHeight
	]}
	{onDismiss}
>
	<div class="context-menu" transition:fade|global={{ duration: 200 }}>
		{#snippet contextMenuButton(name: string, icon: string, onClick: ContextMenuCallback)}
			<button
				class="context-menu-button"
				onclick={() => {
					onClick();

					onDismiss();
				}}
			>
				<i class={icon}></i>
				<p>{name}</p>
			</button>
		{/snippet}

		<!-- {@render contextMenuButton('Delete', 'fa-solid fa-trash', () => {})} -->
		{#if user.isSuspended}
			{@render contextMenuButton('Unsuspend', 'fa-solid fa-check', () => onSuspend(user, false))}
		{:else}
			{@render contextMenuButton('Suspend', 'fa-solid fa-ban', () => onSuspend(user, true))}
		{/if}
	</div>
</Overlay>

<style lang="scss">
	div.context-menu {
		display: flex;
		flex-direction: column;

		padding: 8px;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);
		border-radius: 8px;

		box-shadow: 2px 2px 8px var(--shadow);

		max-width: 172px;
		min-width: 172px;
	}

	button.context-menu-button {
		display: flex;
		flex-direction: row;

		align-items: center;

		gap: 8px;
		padding: 8px;
		border-radius: 8px;

		background-color: unset;
		color: inherit;

		border: none;
	}

	button.context-menu-button:hover {
		background-color: var(--primaryContainer);
		color: var(--onPrimaryContainer);

		cursor: pointer;
	}

	button.context-menu-button:active {
		background-color: var(--primary);
		color: var(--onPrimary);
	}
</style>
