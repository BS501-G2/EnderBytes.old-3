<script lang="ts" context="module">
  export enum FileManagerMode {
    FileExplorer,
    FileBrowser
  }

  export enum FileManagerPage {
    Files = 'files',
    Shared = 'shared',
    Starred = 'starred',
    Trash = 'trash'
  }

  export type FileManagerOnPageCallback = (
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    page: FileManagerPage
  ) => void;

  export type FileManagerOnFileIdCallback = (
    event: (MouseEvent & { currentTarget: HTMLButtonElement }) | null,
    fileId: number | null
  ) => void;

  export type FileManagerOnNewCallback = (
    event: MouseEvent & { currentTarget: HTMLButtonElement }
  ) => void;

  export type FileManagerOnViewCallback = (
    event: MouseEvent & { currentTarget: HTMLButtonElement }
  ) => void;

  export type FileManagerOnSidePanelCallback = (
    event: MouseEvent & { currentTarget: HTMLButtonElement },
    shown: boolean
  ) => void;

  export type FileManagerGetRefreshFunction = (func: () => void) => void;

  export type FileManagerProps = {
    selection: Writable<number[]>;

    onPage?: FileManagerOnPageCallback;
    onFileId?: FileManagerOnFileIdCallback;
    onView?: FileManagerOnViewCallback;
  } & (
    | {
        page: FileManagerPage.Files;

        fileId: Readable<number | null>;

        onNew?: FileManagerOnNewCallback;
      }
    | {
        page: FileManagerPage.Shared | FileManagerPage.Starred | FileManagerPage.Trash;
      }
  ) &
    (
      | {
          mode: FileManagerMode.FileExplorer;
        }
      | {
          mode: FileManagerMode.FileBrowser;

          onSelect?: (fileIds: number[]) => void;
          onCancel?: () => void;
        }
    );

  export function getOnPageCallback({ onPage }: FileManagerProps) {
    return (
      onPage ??
      ((page) => {
        goto('/app/' + page);
      })
    );
  }

  export function getOnFileIdCallback({ onFileId }: FileManagerProps) {
    return (
      onFileId ??
      ((fileId) => {
        goto(`/app/files?id=${fileId}`);
      })
    );
  }

  export interface FileManagerContext {
    props: FileManagerProps;

    sidePanel: Writable<boolean>;

    mobileSelectMode: Writable<[selection: Writable<FileResource[]>] | null>;
    desktopSelectMode: Writable<[capturedSelection: Writable<FileResource[]>] | null>;

    files: Writable<FileResource[]>;

    onRefresh: Writable<(() => void)[]>;
    refresh: Writable<() => void>;
  }

  export const FileManagerContextName = 'file-manager-context';
</script>

<script lang="ts">
  import { goto } from '$app/navigation';

  import { ResponsiveLayout, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { derived, writable, type Readable, type Writable } from 'svelte/store';
  import FileManagerAddressBar from './file-manager-address-bar.svelte';
  import FileManagerView from './file-manager-view.svelte';
  import FileManagerSelectionBar from './file-manager-selection-bar.svelte';
  import { onMount, setContext } from 'svelte';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  const { refresh, ...props }: FileManagerProps & { refresh: Writable<() => void> } = $props();
  const {
    props: { selection },
    onRefresh
  } = setContext<FileManagerContext>(FileManagerContextName, {
    props,

    mobileSelectMode: writable(null),
    desktopSelectMode: writable(null),

    sidePanel: writable(false),

    files: writable([]),
    onRefresh: writable([]),

    refresh
  });

  $refresh = () => {
    for (const refresh of $onRefresh) {
      refresh();
    }
  };
</script>

<div
  class="file-manager"
  class:desktop={($viewMode & ViewMode.Desktop) !== 0}
  class:mobile={($viewMode & ViewMode.Mobile) !== 0}
>
  <ResponsiveLayout>
    {#snippet mobile()}
      {#if props.page === FileManagerPage.Files}
        <FileManagerAddressBar />
      {/if}

      <FileManagerView />

      {#if $selection.length}
        <FileManagerSelectionBar />
      {/if}
    {/snippet}
    {#snippet desktop()}
      {#if props.page === FileManagerPage.Files}
        <FileManagerAddressBar />
      {/if}

      <FileManagerView />

      {#if $selection.length}
        <FileManagerSelectionBar />
      {/if}
    {/snippet}
  </ResponsiveLayout>
</div>

<style lang="scss">
  div.file-manager {
    flex-grow: 1;

    min-height: 0px;

    display: flex;
    flex-direction: column;
  }

  div.file-manager.desktop {
    background-color: var(--background);
    color: var(--onBackground);

    padding: 16px;
    gap: 8px;
  }

  div.file-manager.mobile {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }
</style>
