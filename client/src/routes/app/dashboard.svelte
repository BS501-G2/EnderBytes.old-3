<script lang="ts" context="module">
  export interface DashboardContextMenuEntry {
    name: string;
    icon: string;
    onClick: () => void;
  }

  export interface DashboardContext {
    addContextMenuEntry: (name: string, icon: string, onClick: () => void) => () => void;

    setMainContent: (children: Snippet | null) => () => void;
  }

  export const DashboardContextName = 'dashboard-context';
</script>

<script lang="ts">
  import { getLocale } from '$lib/locale.svelte';

  import LogoutConfirmationDialog from './dashboard-logout-confirm.svelte';
  import { ViewMode, currentColorScheme, viewMode } from '@rizzzi/svelte-commons';
  import SettingsDialog from './settings-dialog.svelte';
  import { setContext, type Snippet } from 'svelte';
  import { derived, type Writable, writable } from 'svelte/store';
  import DashboardNavigation from './dashboard-navigation.svelte';
  import DashboardAppBar from './dashboard-app-bar.svelte';

  const { children }: { children: Snippet } = $props();

  const contextMenuEntries: Writable<[entry: DashboardContextMenuEntry, onDestroy: () => void][]> =
    writable([]);
  const mainContent: Writable<Snippet | null> = writable(null);

  setContext<DashboardContext>(DashboardContextName, {
    addContextMenuEntry: (name, icon, onClick) => {
      const destroy = () => {
        for (let index = 0; index < $contextMenuEntries.length; index++) {
          const {
            [index]: [, onDestroy]
          } = $contextMenuEntries;

          if (onDestroy !== destroy) {
            continue;
          }

          $contextMenuEntries.splice(index--, 1);
        }
      };

      $contextMenuEntries.push([{ name, icon, onClick }, destroy]);

      return destroy;
    },

    setMainContent: (children) => {
      $mainContent = children;

      return () => ($mainContent = null);
    }
  });
</script>

<svelte:head>
  <link rel="manifest" href="/manifest.json?locale={getLocale()}&theme={$currentColorScheme}" />
</svelte:head>

<div
  class="dashboard"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class="title-row">
    <DashboardAppBar
      entries={derived(contextMenuEntries, (entries) => entries.map(([entry]) => entry))}
    />
  </div>
  <div class="content-row" class:desktop={$viewMode & ViewMode.Desktop}>
    {#if $viewMode & ViewMode.Desktop}
      <div class="side-content">
        <DashboardNavigation />
      </div>
    {/if}

    <div class="main-content">
      <div class="main-content-inner">
        {#if $mainContent !== null}
          {@render $mainContent()}
        {/if}
      </div>
    </div>
  </div>
  {#if $viewMode & ViewMode.Mobile}
    <div class="bottom-row">
      <DashboardNavigation />
    </div>
  {/if}
</div>

{@render children()}

<LogoutConfirmationDialog />
<SettingsDialog />

<style lang="scss">
  div.dashboard {
    display: flex;
    flex-direction: column;

    min-width: 100dvw;
    min-height: 100dvh;
    max-width: 100dvw;
    max-height: 100dvh;
  }

  div.dashboard.desktop {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);

    overflow: hidden;
  }

  div.dashboard.mobile {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.title-row {
    display: flex;
    flex-direction: row;

    min-width: 0px;

    margin-top: env(titlebar-area-y);
    margin-left: env(titlebar-area-x);
    max-width: env(titlebar-area-width);
  }

  div.content-row {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    min-width: 0px;
    min-height: 0px;

    > div.side-content {
      display: flex;
      flex-direction: column;

      min-width: 0px;
      min-height: 0px;
    }

    > div.main-content {
      background-color: var(--background);
      color: var(--onBackground);

      flex-grow: 1;

      display: flex;
      flex-direction: column;

      min-width: 0px;
      min-height: 0px;

      border-radius: 16px;

      > div.main-content-inner {
        flex-grow: 1;

        display: flex;
        flex-direction: column;

        min-width: 0px;
        min-height: 0px;
      }
    }
  }

  div.content-row.desktop {
    padding: 8px;
    gap: 8px;
  }

  div.bottom-row {
    display: flex;
    flex-direction: row;

    min-width: 0px;

    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }
</style>
