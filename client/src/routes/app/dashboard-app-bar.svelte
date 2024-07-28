<script lang="ts" context="module">
</script>

<script lang="ts">
  import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { type Readable } from 'svelte/store';
  import type { DashboardContextMenuEntry } from './dashboard.svelte';

  const { entries }: { entries: Readable<DashboardContextMenuEntry[]> } = $props();
</script>

<div
  class="app-bar"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  
</div>

<style lang="scss">
  div.app-bar {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    min-height: calc(32px + 1em);
  }

  div.app-bar.mobile {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }
</style>
