<script lang="ts" context="module">
</script>

<script lang="ts">
  import { AnimationFrame, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { getContext, type Snippet } from 'svelte';
  import { DashboardContextName, type DashboardContext } from './dashboard.svelte';
  import { backgroundTasks, BackgroundTaskStatus } from '$lib/background-task.svelte';
    import { derived } from 'svelte/store';

  const {}: {} = $props();

  let root: HTMLDivElement = $state(null as never);

  const { isWidthLimited } = getContext<DashboardContext>(DashboardContextName);

  const runningTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Running)
  );

  const finishedTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Done)
  );

  const failedTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Failed)
  );
</script>

<div
  class="operations"
  class:mobile={$viewMode === ViewMode.Mobile}
  class:desktop={$viewMode === ViewMode.Desktop}
  class:limiited={$isWidthLimited}
  bind:this={root}
>
  {#if $runningTasks.length > 0}
  {/if}
</div>

<style lang="scss">
  div.operations {
    min-height: 64px;
  }

  div.operations.mobile {
  }

  div.operations.desktop {
  }

  div.operations.desktop.limited {
  }
</style>
