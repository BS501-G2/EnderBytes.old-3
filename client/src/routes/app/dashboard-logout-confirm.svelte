<script lang="ts">
	import { Button, Dialog } from '@rizzzi/svelte-commons';
	import { goto } from '$app/navigation';
	import { clearAuthentication } from '$lib/client/client';

	const { onDismiss }: { onDismiss: () => void } = $props();
</script>

<Dialog dialogClass="normal" {onDismiss}>
	{#snippet actions()}
		<Button
			onClick={async () => {
				clearAuthentication();
				onDismiss();

				location.reload();
			}}
			buttonClass="primary"
		>
			<p class="label">OK</p>
		</Button>
		<Button onClick={onDismiss} buttonClass="background">
			<p class="label">Cancel</p>
		</Button>
	{/snippet}
	{#snippet head()}
		<h2 style="margin: 0px;">Account Logout</h2>
	{/snippet}
	{#snippet body()}
		<span>This will log you out from the dashboard.</span>
	{/snippet}
</Dialog>

<style lang="scss">
	p.label {
		margin: 8px;
	}
</style>
