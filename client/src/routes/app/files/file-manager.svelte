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

    refreshKey: Writable<number>;
    refresh: Writable<() => void>;

    addressBarMenu: Writable<[sourceElement: HTMLButtonElement, fileId: number | null] | null>;

    content: Writable<FileManagerContentContext>
  }

  export type FileManagerContent = (
    | ({
        page: 'files';
        file: FileResource;
        filePathChain: FileResource[];
        myAccess: {
          level: FileAccessLevel;
          access: FileAccessResource | null;
        };
        accesses: FileAccessResource[];
        logs: FileLogResource[];
      } & (
        | {
            type: 'file';
            viruses: string[];
            snapshots: FileSnapshotResource[];
          }
        | {
            type: 'folder';
            files: FileResource[];
          }
      ))
    | {
        page: 'shared' | 'trashed' | 'starred';

        files: FileResource[];
      }
  ) & {
    me: UserResource;
  };

  export type FileManagerContentContext = Promise<FileManagerContent> | null;

  export const FileManagerContextName = 'file-manager-context';
  export const FileManagerContentName = 'file-manager-content';
</script>

<script lang="ts">
  import { goto } from '$app/navigation';

  import { Awaiter, ResponsiveLayout, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { writable, type Readable, type Writable } from 'svelte/store';
  import FileManagerAddressBar from './file-manager-address-bar.svelte';
  import FileManagerView from './file-manager-view.svelte';
  import FileManagerSelectionBar from './file-manager-selection-bar.svelte';
  import { setContext } from 'svelte';
  import type {
    FileAccessResource,
    FileLogResource,
    FileResource,
    FileSnapshotResource,
    UserResource
  } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '$lib/client/client';

  import { FileAccessLevel, FileType } from '@rizzzi/enderdrive-lib/shared';

  const {
    serverFunctions: {
      whoAmI,

      getFile,
      getMyAccess,

      getFilePathChain,

      listFileAccess,
      listFileLogs,
      listFileSnapshots,
      listFileViruses,
      scanFolder,

      listSharedFiles,
      listTrashedFiles,
      listStarredFiles,

      isFileStarred
    }
  } = getConnection();

  const { refresh, ...props }: FileManagerProps & { refresh: Writable<() => void> } = $props();
  const onRefresh: Writable<(() => void)[]> = writable([]);
  const refreshKey = writable(0);

  onRefresh.update((onRefresh) => {
    onRefresh.push(() => refreshKey.update((value) => value + 1));

    return onRefresh;
  });

  const {
    props: { selection }, content
  } = setContext<FileManagerContext>(FileManagerContextName, {
    props,

    mobileSelectMode: writable(null),
    desktopSelectMode: writable(null),

    sidePanel: writable(false),

    refresh,
    refreshKey,

    addressBarMenu: writable(null),

    content: writable(null)
  });

  const fileId = props.page === FileManagerPage.Files ? props.fileId : writable(null);

  $refresh = () => {
    for (const refresh of $onRefresh) {
      console.log('executing');
      refresh();
    }
  };

  fileId.subscribe(() => {
    $refresh();
  });
</script>

{#snippet contentResolver()}
  <Awaiter
    callback={() =>
      ($content = (async (): Promise<FileManagerContent> => {
        const me = (await whoAmI())!;

        if (props.page === FileManagerPage.Files) {
          const file = await getFile($fileId);
          const [filePathChain, myAccess, accesses, logs] = await Promise.all([
            getFilePathChain(file.id),
            getMyAccess(file.id),
            listFileAccess(file.id),
            listFileLogs(file.id)
          ]);

          if (file.type === FileType.File) {
            const [viruses, snapshots] = await Promise.all([
              listFileViruses(file.id),
              listFileSnapshots(file.id)
            ]);

            return {
              me,
              page: 'files',
              type: 'file',
              file,
              filePathChain,
              myAccess,
              accesses,
              logs,
              snapshots,
              viruses
            };
          } else if (file.type === FileType.Folder) {
            const files = await scanFolder(file.id);

            return {
              me,
              page: 'files',
              type: 'folder',
              file,
              filePathChain,
              myAccess,
              accesses,
              logs,
              files
            };
          }
        } else if (props.page === FileManagerPage.Shared) {
          const sharedList = await listSharedFiles();
          const files = await Promise.all(
            sharedList.map((sharedEntry) => getFile(sharedEntry.fileId))
          );

          return {
            me,
            page: 'shared',
            files
          };
        } else if (props.page === FileManagerPage.Trash) {
          const files = await listTrashedFiles();

          return {
            me,
            page: 'trashed',
            files
          };
        } else if (props.page === FileManagerPage.Starred) {
          const starredList = await listStarredFiles();
          const files = await Promise.all(
            starredList.map((starredEntry) => getFile(starredEntry.fileId))
          );

          return {
            me,
            page: 'starred',
            files
          };
        }

        throw new Error('Invalid content details');
      })())}
  />
{/snippet}

{#key $refreshKey}
  {#key $fileId}
    {@render contentResolver()}
  {/key}
{/key}

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
    min-width: 0;

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
