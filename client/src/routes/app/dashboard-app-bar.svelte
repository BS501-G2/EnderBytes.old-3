<script lang="ts">
  import {
    Button,
    ButtonClass,
    titleStack,
    titleString,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import { type Readable } from 'svelte/store';
  import {
    DashboardContextName,
    type DashboardContext,
    type DashboardContextMenuEntry
  } from './dashboard.svelte';
  import { getContext, onMount, type Snippet } from 'svelte';

  const { entries }: { entries: Readable<DashboardContextMenuEntry[]> } = $props();
  const { addContextMenuEntry } = getContext<DashboardContext>(DashboardContextName);

  onMount(() => addContextMenuEntry('Logout', 'fa-solid fa-right-from-bracket', () => ({})));
</script>

{#snippet arrowButtonContainer(view: Snippet)}
  <div class="arrow-button">
    {@render view()}
  </div>
{/snippet}

{#snippet card(className: string, view: Snippet)}
  <div
    class="{className} card"
    class:desktop={$viewMode & ViewMode.Desktop}
    class:mobile={$viewMode & ViewMode.Mobile}
  >
    {@render view()}
  </div>
{/snippet}

{#snippet leftArrowCard()}
  <Button
    outline={false}
    buttonClass={$viewMode & ViewMode.Mobile ? ButtonClass.Transparent : ButtonClass.Primary}
    onClick={() => window.history.back()}
    container={arrowButtonContainer}
  >
    <i class="fa-solid fa-chevron-left"></i>
  </Button>
{/snippet}

{#snippet rightArrowCard()}
  <Button
    outline={false}
    buttonClass={$viewMode & ViewMode.Mobile ? ButtonClass.Transparent : ButtonClass.Primary}
    onClick={() => window.history.forward()}
    container={arrowButtonContainer}
  >
    <i class="fa-solid fa-chevron-right"></i>
  </Button>
{/snippet}

{#snippet titleCard()}
  <img class="title-icon" src="/favicon.svg" alt="logo" />

  <p class="title-text">
    {#if $viewMode & ViewMode.Desktop}
      EnderDrive
    {:else if $viewMode & ViewMode.Mobile}
      {$titleStack
        .slice(1)
        .map((e) => e.title)
        .join(' - ')}
    {/if}
  </p>
{/snippet}

{#snippet contextMenu()}{/snippet}

<div
  class="app-bar"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class="left section">
    {@render card('arrows', leftArrowCard)}

    {#if $viewMode & ViewMode.Desktop}
      {@render card('arrows', rightArrowCard)}
    {/if}

    {@render card('title', titleCard)}
  </div>

  <div class="center section"></div>

  <div class="right section">
    {@render card('context-menu', contextMenu)}
  </div>
</div>

<style lang="scss">
  div.app-bar {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    min-height: calc(16px + 1em);
    max-height: calc(16px + 1em);
    padding: 8px;

    > div.section {
      display: flex;
      flex-direction: row;

      gap: 8px;
    }

    > div.section.center {
      flex-grow: 1;
    }
  }

  div.card {
    min-height: calc(16px + 1em - 8px);

    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: center;

    gap: 8px;
    border-radius: 8px;
  }

  div.card.desktop {
    background-color: var(--primary);
    color: var(--onPrimary);
  }

  div.arrows {
    align-items: unset;
  }

  div.arrow-button {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: center;

    min-width: 16px;
    min-height: 100%;
  }

  div.title {
    padding: 0px 8px;
  }

  img.title-icon {
    min-height: 16px;
    max-height: 16px;
    min-width: 16px;
    max-width: 16px;
  }

  p.title-text {
    font-size: 0.8em;
    line-height: 1em;
  }

  div.app-bar.mobile {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }
</style>
