<script lang="ts">
  import type { Snippet } from 'svelte';
  import DashboardOperations from './dashboard-operations.svelte';
  import { Overlay, OverlayPositionType, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { fly } from 'svelte/transition';

  const { children }: { children: Snippet[] } = $props();

  let width: number = $state(0);
</script>

<svelte:window bind:innerWidth={width} />

{#snippet main()}
  <div
    class="overlay"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
  >
    {#each children as child}
      <div
        class="card"
        transition:fly={{ duration: 200, y: $viewMode & ViewMode.Mobile ? -16 : 16 }}
      >
        {@render child()}
      </div>
    {/each}
  </div>
{/snippet}

{#if children.length}
  {#if $viewMode & ViewMode.Desktop}
    <Overlay position={[OverlayPositionType.Offset, width - 480, -0]} no-pointer-events>
      {@render main()}
    </Overlay>
  {:else if $viewMode & ViewMode.Mobile}
    <Overlay position={[OverlayPositionType.Offset, 0, 0]} no-pointer-events>
      {@render main()}
    </Overlay>
  {/if}
{/if}

<DashboardOperations />

<style lang="scss">
  div.overlay {
    display: flex;
    flex-direction: column-reverse;

    gap: 8px;
    padding: 16px;

    box-sizing: border-box;
  }

  div.overlay.mobile {
    min-width: 100dvw;
    max-width: 100dvw;
  }

  div.overlay.desktop {
    min-height: 100dvh;
    max-height: 100dvh;

    min-width: 480px;
    max-width: 480px;
  }

  div.card {
    pointer-events: auto;

    display: flex;
    flex-direction: column;

    border-radius: 8px;

    overflow: hidden;

    box-shadow: 2px 2px 8px var(--shadow);

    background-color: var(--primary);
    color: var(--onPrimary);
  }
</style>
