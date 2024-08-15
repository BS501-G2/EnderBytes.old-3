<script lang="ts">
  import {
    Button,
    ButtonClass,
    Input,
    InputType,
    titleStack,
    titleString,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import { writable, type Readable } from 'svelte/store';
  import {
    DashboardContextName,
    type DashboardContext,
    type DashboardContextMenuEntry
  } from './dashboard.svelte';
  import { getContext, onMount, type Snippet } from 'svelte';

  const { contextMenuEntries }: { contextMenuEntries: DashboardContextMenuEntry[] } = $props();
</script>

{#snippet topBarButtonContainer(view: Snippet)}
  <div class="top-bar-button">
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
    container={topBarButtonContainer}
  >
    <i class="fa-solid fa-chevron-left"></i>
  </Button>
{/snippet}

{#snippet rightArrowCard()}
  <Button
    outline={false}
    buttonClass={$viewMode & ViewMode.Mobile ? ButtonClass.Transparent : ButtonClass.Primary}
    onClick={() => window.history.forward()}
    container={topBarButtonContainer}
  >
    <i class="fa-solid fa-chevron-right"></i>
  </Button>
{/snippet}

{#snippet titleCard()}
  {#if $viewMode & ViewMode.Desktop}
    <img class="title-icon" src="/favicon.svg" alt="logo" />
  {/if}

  <p class="title-text" class:mobile={$viewMode & ViewMode.Mobile}>
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

{#snippet rightTopBar()}
  <Button buttonClass={ButtonClass.Transparent} outline={false} onClick={() => {}} container={topBarButtonContainer}>
    <i class="fa-solid fa-search"></i>
  </Button>
  <Button buttonClass={ButtonClass.Transparent} outline={false} onClick={() => {}} container={topBarButtonContainer}>
    <i class="fa-solid fa-ellipsis-vertical"></i>
  </Button>

{/snippet}

<div
  class="app-bar"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div
    class="left section"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
  >
    {@render card('arrows', leftArrowCard)}

    {#if $viewMode & ViewMode.Desktop}
      {@render card('arrows', rightArrowCard)}
    {/if}

    {@render card('title', titleCard)}
  </div>

  <div
    class="right section"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
  >
    {#if $viewMode & ViewMode.Desktop}
      <div class="search">
        <Input
          type={InputType.Text}
          icon="fa-solid fa-magnifying-glass"
          placeholder="Search..."
          value={writable('')}
        />
      </div>
    {:else if $viewMode & ViewMode.Mobile}
      {@render card('right', rightTopBar)}
    {/if}
  </div>
</div>

<style lang="scss">
  div.app-bar {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    min-height: calc(16px + 1em);
    max-height: calc(16px + 1em);

    gap: 8px;

    > div.section {
      display: flex;
      flex-direction: row;

      gap: 8px;
    }

    > div.section.mobile {
      gap: 0;
    }

    > div.section.left {
      min-width: 256px;
      max-width: 256px;
    }

    > div.section.right.desktop {
      flex-grow: 1;

      justify-content: safe center;
    }

    > div.section.right.mobile {
      justify-content: flex-end;
    }

    > div.section.mobile {
      flex-grow: 1;
    }
  }

  div.card {
    -webkit-app-region: no-drag;

    min-height: calc(16px + 1em - 8px);

    display: flex;
    flex-direction: row;

    justify-content: center;

    border-radius: 8px;
  }

  div.card.desktop {
    background-color: var(--primary);
    color: var(--onPrimary);
  }

  div.arrows {
    align-items: unset;
  }

  div.top-bar-button {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: center;

    min-width: 16px;
    min-height: 100%;
  }

  div.title {
    -webkit-app-region: drag;

    align-items: center;

    gap: 8px;
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

  p.title-text.mobile {
    font-size: 1em;
    font-weight: bold;
  }

  div.app-bar.mobile {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }

  div.context-menu {
    display: flex;
    flex-direction: row;
  }

  div.profile-button {
    color: var(--primaryContainer);

    display: flex;

    align-items: center;

    min-height: 100%;
    max-height: 100%;
  }

  div.search {
    min-width: min(512px, 100%);
    width: 50%;
    max-width: 50%;

    display: flex;
    flex-direction: column;

    -webkit-app-region: no-drag;
  }
</style>
