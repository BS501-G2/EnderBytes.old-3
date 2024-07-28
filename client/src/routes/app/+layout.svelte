<script lang="ts">
  import { type Snippet } from 'svelte';

  import Dashboard from './dashboard.svelte';
  import { runningBackgroundTasks } from '$lib/background-task.svelte';

  const { children }: { children: Snippet } = $props();
</script>

<svelte:window
  on:beforeunload={(event) => {
    if ($runningBackgroundTasks.length == 0) {
      return;
    }

    event.preventDefault();
    return 'There are pending tasks in the queue. Are you sure you want to leave?';
  }}
/>

<Dashboard>
  {@render children()}
</Dashboard>
