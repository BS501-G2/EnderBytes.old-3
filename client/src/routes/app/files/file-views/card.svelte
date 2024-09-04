<script lang="ts">
	import type { Snippet } from 'svelte';

	const { title, message }: { title: string; message: Snippet } = $props();
</script>

<div class="card-container">
	<div class="header">
		<h2>{title}</h2>
	</div>

	<div class="body">
		{@render message()}
	</div>
</div>

<style lang="scss">
	div.card-container {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		justify-content: safe center;
	}
</style>
