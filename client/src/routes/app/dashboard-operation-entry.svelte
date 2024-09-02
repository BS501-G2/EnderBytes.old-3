<script lang="ts" generics="T extends any">
  import { AnimationFrame } from '@rizzzi/svelte-commons';
  import { BackgroundTaskStatus, type BackgroundTask } from '$lib/background-task';
  import DashboardOperationEntryInner from './dashboard-operation-entry-inner.svelte';

  const { task }: { task: BackgroundTask<T> } = $props();

  const timeoutMax = 10000;
  let timeout: number = $state(0);
  let error: boolean = task.status === BackgroundTaskStatus.Failed;
</script>

<AnimationFrame
  callback={() => {
    if (
      task.status === BackgroundTaskStatus.Running ||
      (task.status === BackgroundTaskStatus.Failed && task.retryable)
    ) {
      timeout = Date.now();
      return;
    }

    timeout = timeoutMax - (Date.now() - task.lastUpdated);

    if (timeout <= 0) {
      task.dismiss()
    }
  }}
/>

{#if timeout > 0 || error}
  <DashboardOperationEntryInner {task} {timeout} timeout-max={timeoutMax} />
{/if}
