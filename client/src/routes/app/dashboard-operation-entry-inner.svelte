<script lang="ts" generics="T extends any">
	import { Button, LoadingBar } from '@rizzzi/svelte-commons';
	import { DashboardContextName, type DashboardContext } from './dashboard';
	import { getContext, onMount, type Snippet } from 'svelte';
	import { BackgroundTaskStatus, type BackgroundTask } from '$lib/background-task';

	const {
		task,
		timeout,
		'timeout-max': timeoutMax
	}: { task: BackgroundTask<T>; timeout: number; 'timeout-max': number } = $props();

	const { pushOverlayContent } = getContext<DashboardContext>(DashboardContextName);

	onMount(() => pushOverlayContent(card as Snippet));

	function progressToString(progress: number): string {
		if (task.status === BackgroundTaskStatus.Failed) {
			return 'Failed';
		} else if (task.status === BackgroundTaskStatus.Done) {
			return 'Done';
		} else if (task.status === BackgroundTaskStatus.Running) {
			if (progress < 0) {
				return 'Starting';
			} else if (progress > 1) {
				return 'Done';
			} else {
				return `${Math.round(progress * 100)}%`;
			}
		} else if (task.status === BackgroundTaskStatus.Cancelled) {
			return 'Cancelled';
		}

		return 'Unknown';
	}

	type Action = () => void;
</script>

{#snippet card()}
	<div class="card">
		{#if task.status === BackgroundTaskStatus.Running}
			<LoadingBar progress={task.progress} />
		{:else if task.status === BackgroundTaskStatus.Done}
			<LoadingBar progress={timeout / timeoutMax} />
		{/if}

		<div class="message-row">
			<p class="message">{task.message ?? ''}</p>
			<p class="status">{progressToString(task.progress ?? -1)}</p>

			<div class="actions">
				{#snippet action(icon: string, hint: string, onClick: Action)}
					<Button buttonClass="transparent" outline={false} {onClick} {hint}>
						<i class={icon}></i>
					</Button>
				{/snippet}

				{#if task.status === BackgroundTaskStatus.Failed && task.retryable}
					{@render action('fa-solid fa-redo', 'Retry', () => void task.run())}
				{/if}

				{#if task.status === BackgroundTaskStatus.Running}
					{@render action('fa-solid fa-xmark', 'Cancel', () => void task.cancel())}
				{:else}
					{@render action('fa-solid fa-xmark', 'Dismiss', () => void task.dismiss())}
				{/if}
			</div>
		</div>
	</div>
{/snippet}

<style lang="scss">
	div.card {
		padding: 0px 8px;
	}

	div.message-row {
		display: flex;
		flex-direction: row;

		gap: 8px;
		padding: 8px;

		font-size: 0.8em;

		min-width: 0px;

		> p.message {
			flex-grow: 1;
		}

		> p.status {
			text-align: right;
		}
	}
</style>
