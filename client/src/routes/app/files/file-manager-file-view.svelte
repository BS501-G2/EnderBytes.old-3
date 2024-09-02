<script lang="ts" module>
  export interface FileViewContext {
    setTopBarContent: (view: Snippet<[data: FileViewData]>) => () => void;
    setBottomBarContent: (view: Snippet<[data: FileViewData]>) => () => void;

    setSnapshotId: (id: number) => void;

    showMobileActions: Writable<[element: HTMLElement] | null>;
  }

  export const FileViewContextName = 'file-view-context';

  export interface FileViewData {
    file: FileResource;
    mime: [mime: string, description: string];
    viruses: string[];
    snapshots: FileSnapshotResource[];
  }
</script>

<script lang="ts">
  import { getConnection } from '$lib/client/client';
  import Icon from '$lib/ui/icon.svelte';
  import type { FileResource, FileSnapshotResource } from '@rizzzi/enderdrive-lib/server';
  import { AnimationFrame, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { setContext, type Snippet } from 'svelte';
  import { fly, scale } from 'svelte/transition';
  import FileManagerFileViewContent from './file-manager-file-view-content.svelte';
    import { writable, type Writable } from 'svelte/store';

  const { fileId }: { fileId: number } = $props();

  const {
    serverFunctions: { getFile, getFileMime, listFileViruses, listFileSnapshots }
  } = getConnection();

  let topBarContent: Snippet<[data: FileViewData]> = $state(emptyBar);
  let bottomBarContent: Snippet<[data: FileViewData]> = $state(emptyBar);

  const {} = setContext<FileViewContext>(FileViewContextName, {
    setTopBarContent: (view) => {
      topBarContent = view;
      return () => {
        if (topBarContent === view) {
          topBarContent = emptyBar;
        }
      };
    },
    setBottomBarContent: (view) => {
      bottomBarContent = view;
      return () => {
        if (bottomBarContent === view) {
          bottomBarContent = emptyBar;
        }
      };
    },

    setSnapshotId: (id: number) => {
      snapshotId = id;
    },

    showMobileActions: writable(null as never)
  });

  let snapshotId: number | null = $state(null as never);
  let tab: number = $state(0);

  let lastMouseActivity: number = $state(Date.now());
  let showActions: boolean = $state(true);

  let fileViewElement: HTMLDivElement = $state(null as never);

  async function load(): Promise<FileViewData> {
    const file = await getFile(fileId);
    const mime = await getFileMime(fileId);
    const viruses = await listFileViruses(fileId);
    const snapshots = await listFileSnapshots(fileId);

    return { file, mime, viruses, snapshots };
  }

  function updateLastMouseActivity() {
    lastMouseActivity = Date.now();

    checkHover();
  }

  function checkHover() {
    showActions = Date.now() - lastMouseActivity < 25000;
  }
</script>

{#snippet emptyBar(data: FileViewData)}
  <!-- Empty -->
{/snippet}

<AnimationFrame callback={checkHover} />

{#snippet bar(data: FileViewData, position: 'bottom' | 'top', view: Snippet<[data: FileViewData]>)}
  <div
    class="bar-container"
    class:bottom={position === 'bottom'}
    transition:fly={{ y: position === 'bottom' ? 32 : -32 }}
    class:fullscreen={$viewMode & ViewMode.Mobile || $viewMode & ViewMode.Fullscreen}
      class:mobile={$viewMode & ViewMode.Mobile}
      class:desktop={$viewMode & ViewMode.Desktop}
  >
    <div
      class="{position} bar"
      class:fullscreen={$viewMode & ViewMode.Mobile || $viewMode & ViewMode.Fullscreen}
      class:mobile={$viewMode & ViewMode.Mobile}
      class:desktop={$viewMode & ViewMode.Desktop}
    >
      {@render view(data)}
    </div>
  </div>
{/snippet}

{#snippet card(header: string, message: string)}
  <div class="message-card-container">
    <div class="message-card">
      <div class="side">
        <Icon icon="triangle-exclamation" thickness="solid" size="2xl" />
      </div>

      <div class="main">
        <div class="header">
          <h2>{header}</h2>
        </div>
        <div class="message">
          {#each message.split('\n') as messageEntry, index}
            {#if index !== 0}
              <br />
            {/if}

            {messageEntry}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/snippet}

<div
  bind:this={fileViewElement}
  class="file-view"
  class:fullscreen={$viewMode & ViewMode.Mobile || $viewMode & ViewMode.Fullscreen}
  role="document"
  in:scale|global={{ duration: 200, start: 0.95 }}
  onmousemove={updateLastMouseActivity}
  ontouchend={updateLastMouseActivity}
  class:dark={$viewMode & ViewMode.Desktop}
  class:main={tab === 0}
>
  {#if $viewMode & ViewMode.Mobile}
   <div class="mobile-appbar"></div>
  {/if}

  {#key snapshotId}
    {#await load() then data}
      {#if showActions}
        {@render bar(data, 'top', topBarContent)}
      {/if}

      <FileManagerFileViewContent {...data} />

      {#if showActions}
        {@render bar(data, 'bottom', bottomBarContent)}
      {/if}
    {:catch error}
      {@render card('An error has occured trying to view this file.', error.message)}
    {/await}
  {/key}
</div>

<style lang="scss">
  div.mobile.appbar {
    min-height: env(titlebar-area-height, 0);
    max-height: env(titlebar-area-height, 0);

  }

  div.file-view {
    overflow: hidden;

    flex-grow: 1;

    min-width: 0;

    display: flex;
    flex-direction: column;

    margin: 8px;
    border-radius: 8px;
  }

  div.file-view.main {
    background-color: var(--shadow);
    color: var(--onBackground);
  }

  div.file-view.fullscreen {
    position: fixed;

    top: 0;
    left: 0;

    min-width: 100dvw;
    min-height: 100dvh;
    max-width: 100dvw;
    max-height: 100dvh;

    margin: 0;

    box-sizing: border-box;

    border-radius: 0;

    background-color: #0f0f0f;
    color: white;
  }

  div.message-card-container {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: safe center;

    overflow: hidden auto;

    min-height: 0px;
    min-width: 0px;

    padding: 8px;
  }

  div.message-card {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);

    display: flex;
    flex-direction: row;
    align-items: center;

    gap: 16px;
    padding: 16px;
    border-radius: 8px;

    box-shadow: 2px 2px 8px var(--shadow);

    > div.side,
    > div.main {
      display: flex;
      flex-direction: column;
    }

    > div.main {
      flex-grow: 1;
    }
  }

  div.bar-container {
    position: relative;

    display: flex;
    flex-direction: column;

    min-height: 0;
    max-height: 0;
  }

  div.bar-container.bottom {
    top: calc(-32px + -24px);
  }

  div.bar-container.bottom.fullscreen {
    top: -48px;
  }

  div.bar {
    min-height: 24px;
    max-height: 24px;

    min-width: 0;

    display: flex;
    flex-direction: row;

    gap: 8px;

    padding: 8px;
    margin: 8px;
    border-radius: 8px;

    background-color: rgba($color: #000000, $alpha: 0.5);
    color: white;

    overflow: hidden;
  }

  div.bar.top.fullscreen {
    border-bottom: 1px solid var(--onPrimaryContainer);
  }
  div.bar.bottom.fullscreen {
    border-top: 1px solid var(--onPrimaryContainer);
  }

  div.bar.fullscreen {
    min-height: 32px;
    max-height: 32px;

    margin: 0;

    border-radius: 0;

    background-color: transparent;
    color: inherit;
  }

  div.bar.bottom.mobile {
    padding: 0;

    min-height: 48px;
    max-height: 48px;
  }

  div.content {
    flex-grow: 1;

    display: flex;
  }
</style>
