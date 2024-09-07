<script lang="ts">
	import { getContext, onMount } from 'svelte';
	import { FileViewerContextName, type FileViewerContext } from './file-view.svelte';
	import { Button } from '@rizzzi/svelte-commons';
	import Icon from '$lib/ui/icon.svelte';

	const { pushTopContent } = getContext<FileViewerContext>(FileViewerContextName);

	onMount(() => pushTopContent(button));
</script>

{#snippet button()}
	<Button
		onClick={() => {
			console.log('clicked');
		}}
	>
		<div class="button">
			<Icon icon="icon-left" />
			<p>Test</p>
		</div>
	</Button>
{/snippet}

<div class="file-view">
</div>

<style lang="scss">
	div.button {
		display: flex;
		flex-direction: row;

		align-items: center;
		gap: 8px;
	}
</style>
