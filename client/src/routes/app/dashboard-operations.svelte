<script lang="ts">
  import { backgroundTasks } from '$lib/background-task.svelte';
  import DashboardOperationEntry from './dashboard-operation-entry.svelte';
</script>

{#each $backgroundTasks as task}
  <DashboardOperationEntry {task} />
{/each}

<style lang="scss">
</style>
