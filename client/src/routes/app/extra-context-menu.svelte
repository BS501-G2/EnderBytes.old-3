<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import {
    DashboardContextName,
    type DashboardContext,
    type DashboardContextMenuEntry
  } from './dashboard';
  import { Overlay, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { fly } from 'svelte/transition';

  const {} = getContext<DashboardContext>(DashboardContextName);

  const {
    element,
    entries,
    onDismiss
  }: { element: HTMLElement; entries: DashboardContextMenuEntry[]; onDismiss: () => void } =
    $props();

  onMount(() =>
    viewMode.subscribe((value) => {
      if (value & ViewMode.Desktop) {
        onDismiss();
      }
    })
  );
</script>

<Overlay
  position={['offset', 0, element.clientTop + element.clientHeight + 16]}
  {onDismiss}
>
  <div
    class="extra"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
    transition:fly|global={{ duration: 200, y: $viewMode & ViewMode.Mobile ? -16 : 0 }}
  >
    {#each entries as entry, index}
      {#if index !== 0}
        <div class="separator"></div>
      {/if}
      <button
        class="extra-entry"
        onclick={(event) => {
          onDismiss();
          entry.onClick(event);
        }}
      >
        <i class="icon fa-solid fa-{entry.icon}"></i>
        <p class="label">{entry.name}</p>
      </button>
    {/each}
  </div>
</Overlay>

<style lang="scss">
  div.extra {
    display: flex;
    flex-direction: column;

    gap: 4px;
    padding: 8px;

    box-sizing: border-box;
  }

  div.separator {
    min-height: 1px;
    max-height: 1px;

    background-color: var(--onPrimaryContainer);
    padding: 0px 8px;
  }

  div.extra.mobile {
    min-width: 100dvw;
    max-width: 100dvw;
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }

  div.extra.desktop {
    background-color: var(--primary);
    color: var(--onPrimary);

    border-radius: 8px;
  }

  button.extra-entry {
    display: flex;
    flex-direction: row;

    align-items: center;
    text-align: start;

    gap: 8px;

    padding: 8px;

    background-color: transparent;
    color: inherit;

    border: none;
  }

  i.icon {
    font-size: 16px;
    text-align: center;

    min-width: 16px;
    max-width: 16px;
    min-height: 16px;
    max-height: 16px;
  }

  p.label {
    margin: 0;

    flex-grow: 1;
  }
</style>
