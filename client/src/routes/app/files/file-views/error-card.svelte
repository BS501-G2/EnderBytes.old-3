<script lang="ts" module>
</script>

<script lang="ts">
	const { title, message }: { title: string; message: string } = $props();
</script>

<div class="error-card">
	<div class="error-card-inner">
		<div class="header">
			<h2>{title}</h2>
		</div>

		<div class="body">
			<p>{message}</p>
		</div>
	</div>
</div>

<style lang="scss">
	div.error-card {
		display: flex;
		flex-direction: column;
		align-items: center;

		> div.error-card-inner {
            display: flex;
            flex-direction: column;

			min-width: 256px;
			max-width: 256px;

            gap: 16px;
			padding: 16px;
            border-radius: 8px;
            box-shadow: 2px 2px 16px var(--shadow);

			background-color: var(--backgroundVariant);
		}
	}
</style>
