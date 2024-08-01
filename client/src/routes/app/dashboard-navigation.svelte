<script lang="ts" context="module">
  export interface NavigationEntry {
    id: string;
    parentId?: string;

    path: string;
    name: string;

    icon: (selected: boolean) => string;
  }
</script>

<script lang="ts">
  import { goto } from '$app/navigation';

  import { page } from '$app/stores';
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
  import { onMount } from 'svelte';
  import { writable, type Writable } from 'svelte/store';

  const entries: NavigationEntry[] = [
    {
      id: 'feed',

      name: 'Feed',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-newspaper`,

      path: '/app/feed'
    },
    {
      id: 'files',

      name: 'Files',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-folder`,

      path: '/app/files'
    },
    {
      id: 'starred',
      parentId: 'files',

      name: 'Starred',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-star`,

      path: '/app/starred'
    },
    {
      id: 'shared',
      parentId: 'files',

      name: 'Shared',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-share-from-square`,

      path: '/app/shared'
    },
    {
      id: 'trash',
      parentId: 'files',

      name: 'Trash',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-trash-can`,

      path: '/app/trash'
    },
    {
      id: 'profile',

      name: 'Users',
      icon: (selected) => `fa-${selected ? 'solid' : 'regular'} fa-user`,

      path: '/app/users'
    }
  ];

  function getChildNavigationEntries(navigationEntry: NavigationEntry): NavigationEntry[] {
    return entries.filter((entry) => entry.parentId === navigationEntry.id);
  }

  function isSelected(navigationEntry: NavigationEntry): boolean {
    const {
      url: { pathname: currentPath }
    } = $page;
    console.log(currentPath, navigationEntry.path.split('?')[0]);

    return !!(
      currentPath === navigationEntry.path.split('?')[0] ||
      ($viewMode & ViewMode.Mobile &&
        getChildNavigationEntries(navigationEntry).some((entry) => isSelected(entry)))
    );
  }

  const isWidthLimited: Writable<boolean> = writable(false);

  function updatelimitedState() {
    const newValue = window.innerWidth < 1280;

    if ($isWidthLimited !== newValue) {
      $isWidthLimited = newValue;
    }
  }

  onMount(() => updatelimitedState());
</script>

<svelte:window onresize={updatelimitedState} />

{#snippet entryView(entry: NavigationEntry, selected: boolean)}
  <button
    class="navigation-entry"
    class:selected
    onclick={() => goto(entry.path)}
    class:desktop={$viewMode & ViewMode.Desktop}
    class:mobile={$viewMode & ViewMode.Mobile}
    class:limited={$isWidthLimited}
  >
    <div class="icon">
      <i class={entry.icon(selected)}></i>
    </div>
    <p class="label">{entry.name}</p>
  </button>
{/snippet}

<div
  class="navigation"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
  class:limited={$isWidthLimited}
>
  {#key $page}
    {#each entries as entry}
      {@const selected = isSelected(entry)}

      {#if $viewMode & ViewMode.Desktop}
        {@render entryView(entry, selected)}
      {:else if $viewMode & ViewMode.Mobile}
        {#if entry.parentId == null}
          {@render entryView(entry, selected)}
        {/if}
      {/if}
    {/each}
  {/key}
</div>

<style lang="scss">
  div.navigation {
    display: flex;

    min-width: 0;
    min-height: 0;
  }

  div.navigation.desktop {
    flex-grow: 1;

    flex-direction: column;

    gap: 8px;

    min-width: 256px;
    max-width: 256px;

    overflow: hidden auto;
  }

  div.navigation.desktop.limited {
    min-width: 64px;
    max-width: 64px;
  }

  div.navigation.mobile {
    flex-grow: 1;

    flex-direction: row;

    min-height: calc(40px + 1em);

    overflow: auto hidden;
  }

  button.navigation-entry {
    -webkit-app-region: no-drag;

    display: flex;

    align-items: center;
    flex-direction: column;

    gap: 4px;
    padding: 4px;

    overflow: auto hidden;

    background-color: unset;
    color: inherit;

    border: none;

    > p.label {
      line-height: 1em;
    }
  }

  button.navigation-entry.desktop {
    cursor: pointer;
    padding: 8px;

    flex-direction: row;
    justify-content: safe start;

    border-radius: 8px;

    > div.icon {
      // flex-grow: 1;

      display: flex;

      align-items: center;
      justify-content: center;

      min-width: 32px;
      max-width: 32px;

      font-size: 1em;
    }

    > p.label {
      flex-grow: 1;
      font-size: 1.2em;

      text-align: start;
    }
  }

  button.navigation-entry.desktop.limited {
    min-width: 64px;
    min-height: 64px;

    flex-direction: column;
    align-items: center;
    padding: 4px;

    > div.icon {
      flex-grow: 1;
      font-size: 1.5em;
    }

    > p.label {
      flex-grow: 0.5;
      font-size: 0.75em;
    }
  }

  button.navigation-entry.mobile {
    flex-grow: 1;

    justify-content: center;

    > div.icon {
      font-size: 1.5em;
    }
  }

  button.navigation-entry.selected {
    background-color: var(--primary);
    color: var(--onPrimary);

    font-weight: bolder;
  }

  button.navigation-entry.mobile.selected {
    background-color: unset;
    color: inherit;
  }
</style>
