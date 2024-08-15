<script lang="ts">
  import { getContext } from 'svelte';
  import {
    DashboardContextName,
    type DashboardContext,
    type DashboardContextMenuEntry
  } from './dashboard.svelte';
  import { Overlay, OverlayPositionType } from '@rizzzi/svelte-commons';

  const {} = getContext<DashboardContext>(DashboardContextName);

  const {
    element,
    entries,
    onDismiss
  }: { element: HTMLElement; entries: DashboardContextMenuEntry[]; onDismiss: () => void } =
    $props();
</script>

<Overlay position={[OverlayPositionType.Offset, 0, 0]} {onDismiss}>
  <div class="extra">
    {#each entries as entry}
      <div class="extra-entry">
        <i class="fa-solid fa-{entry.icon}"></i>
      </div>
    {/each}
  </div>
</Overlay>

<style lang="scss">
</style>
