<script lang="ts" context="module">
  import type {
    FileAccessResource,
    FileLogResource,
    FileResource,
    FileSnapshotResource,
    UserResource
  } from '@rizzzi/enderdrive-lib/server';
  import { FileType, type FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
  import { setContext, type Snippet } from 'svelte';
  import { get, writable, type Readable, type Writable } from 'svelte/store';

  export type SourceEvent = MouseEvent;

  export type FileManagerOnFileIdCallback = (event: SourceEvent, fileId: number | null) => void;
  export type FileManagerOnPageCallback = (
    event: SourceEvent,
    page: 'files' | 'shared' | 'trashed' | 'starred'
  ) => void;

  export type FileManagerProps = {
    refresh: Writable<() => void>;

    onFileId: FileManagerOnFileIdCallback;
    onPage: FileManagerOnPageCallback;
  } & (
    | {
        page: 'files';

        fileId: Readable<number | null>;
      }
    | {
        page: 'shared' | 'starred' | 'trash';
      }
  );

  export type FileManagerResolved =
    | {
        status: 'loading';
      }
    | {
        status: 'error';
        error: Error;
      }
    | ({
        status: 'success';
        me: UserResource;
      } & (
        | ({
            page: 'files';

            file: FileResource;
            filePathChain: FileResource[];
            myAccess: {
              level: FileAccessLevel;
              access: FileAccessResource | null;
            };
            accesses: FileAccessResource[];
            // logs: FileLogResource[];
          } & (
            | {
                type: 'file';

                viruses: string[];
                snapshots: FileSnapshotResource[];
              }
            | {
                type: 'folder';

                files: FileResource[];
                selection: Writable<[event: SourceEvent, files: FileResource[]] | null>;
              }
          ))
        | {
            page: 'shared' | 'starred' | 'trash';

            files: FileResource[];
            selection: Writable<[event: SourceEvent, files: FileResource[]] | null>;
          }
      ));

  export interface FileManagerContext {
    refreshKey: Writable<number>;

    resolved: Writable<FileManagerResolved>;
  }

  export type FileManagerAction = {
    name: string;
    icon: string;

    action: (event: MouseEvent) => Promise<void>;
  };

  export type FileManagerActionGenerator = () => FileManagerAction | null;

  export const FileManagerPropsName = 'fm-props';
  export const FileManagerContextName = 'fm-context';
</script>

<script lang="ts">
  import {
    Awaiter,
    Banner,
    BannerClass,
    Button,
    ButtonClass,
    LoadingSpinner,
    ResponsiveLayout,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import { getConnection } from '$lib/client/client';
  import { scale } from 'svelte/transition';
  import { persisted } from 'svelte-persisted-store';
  import FileManagerActionBar from './file-manager-action-bar.svelte';
  import FileManagerFolderList from './file-manager-folder-list.svelte';
  import FileManagerSideBar from './file-manager-side-bar.svelte';
  import FileManagerBottomBar from './file-manager-bottom-bar.svelte';
  import FileManagerFileView from './file-manager-file-view.svelte';
  import FileManagerSeparator from './file-manager-separator.svelte';
  import FileManagerAddressBar from './file-manager-address-bar.svelte';

  const { ...props }: FileManagerProps = $props();
  const { refresh, onFileId, onPage } = props;
  const showInfoBar = persisted('side-bar', false);

  const {
    serverFunctions: {
      whoAmI,
      getFile,
      getFilePathChain,
      getMyAccess,
      listFileAccess,
      listFileLogs,
      listFileSnapshots,
      listFileViruses,
      listSharedFiles,
      listStarredFiles,
      listTrashedFiles,
      scanFolder
    }
  } = getConnection();

  setContext<FileManagerProps>(FileManagerPropsName, props);
  const { refreshKey, resolved } = setContext<FileManagerContext>(FileManagerContextName, {
    refreshKey: writable(0),
    resolved: writable({ status: 'loading' })
  });

  refresh.set(() => refreshKey.update((value) => value + 1));

  const fileId = props.page === 'files' ? props.fileId : writable(null);

  fileId.subscribe(() => $refresh());

  async function load(): Promise<void> {
    $resolved = { status: 'loading' };

    try {
      // throw new Error('Simulated Exception');
      await new Promise<void>((resolve) => setTimeout(resolve, 1000));

      const me = (await whoAmI())!;

      if (props.page === 'files') {
        const file = await getFile($fileId);
        const [filePathChain, myAccess, accesses /* logs */] = await Promise.all([
          getFilePathChain(file.id),
          getMyAccess(file.id),
          listFileAccess(file.id)
          // listFileLogs(file.id)
        ]);

        if (file.type === FileType.File) {
          const [viruses, snapshots] = await Promise.all([
            listFileViruses(file.id),
            listFileSnapshots(file.id)
          ]);

          $resolved = {
            me,
            page: 'files',
            status: 'success',
            file,
            filePathChain,
            myAccess,
            accesses,
            type: 'file',
            viruses,
            snapshots
          };
        } else if (file.type === FileType.Folder) {
          const files = await scanFolder(file.id);

          $resolved = {
            me,
            page: 'files',
            status: 'success',
            file,
            filePathChain,
            myAccess,
            accesses,
            type: 'folder',
            files,
            selection: writable(null)
          };
        }
      } else if (props.page === 'shared') {
        const shareList = await listSharedFiles();
        const files = await Promise.all(shareList.map((sharedFile) => getFile(sharedFile.id)));

        $resolved = {
          me,
          status: 'success',
          page: 'shared',
          files,
          selection: writable(null)
        };
      } else if (props.page === 'starred') {
        const starredList = await listStarredFiles();
        const files = await Promise.all(starredList.map((starredFile) => getFile(starredFile.id)));

        $resolved = {
          me,
          status: 'success',
          page: 'starred',
          files,
          selection: writable(null)
        };
      } else if (props.page === 'trash') {
        const files = await listTrashedFiles();

        $resolved = {
          me,
          status: 'success',
          page: 'trash',
          files,
          selection: writable(null)
        };
      }
    } catch (error: unknown) {
      $resolved = { status: 'error', error: error as Error };
    }
  }
</script>

{#key $refreshKey}
  <Awaiter callback={load} />
{/key}

<div
  class="file-manager"
  class:mobile={$viewMode & ViewMode.Mobile}
  class:desktop={$viewMode & ViewMode.Desktop}
>
  {#if props.page === 'files'}
    <FileManagerAddressBar />
  {/if}

  <div
    class="main-view"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
    class:loading={$resolved.status === 'loading'}
    class:preview-mode={$resolved.status === 'success' &&
      $resolved.page === 'files' &&
      $resolved.type === 'file'}
  >
    {#if $resolved.status === 'loading'}
      <LoadingSpinner size="64px" />
    {:else if $resolved.status === 'error'}
      <Banner bannerClass={BannerClass.Error}>
        <div class="main-view-error">
          <h3>{$resolved.error.name}: {$resolved.error.message}</h3>
          <pre>{$resolved.error.stack}</pre>
        </div>
      </Banner>
    {:else if $resolved.status === 'success'}
      {#if $viewMode & ViewMode.Desktop}
        <FileManagerActionBar />
        <FileManagerSeparator orientation="horizontal" with-margin />
      {/if}

      <div class="view-row">
        {#if $resolved.page === 'files' && $resolved.type === 'file'}
          <FileManagerFileView />
        {:else}
          <FileManagerFolderList />
        {/if}

        {#if $viewMode & ViewMode.Desktop && $showInfoBar}
          <FileManagerSeparator orientation="vertical" with-margin />
          <FileManagerSideBar />
        {/if}
      </div>

      {#if $viewMode & ViewMode.Desktop}
        <FileManagerSeparator orientation="horizontal" with-margin />
        <FileManagerBottomBar />
      {/if}

      {#if $viewMode & ViewMode.Mobile}
        <FileManagerSeparator orientation="horizontal" />
        <FileManagerActionBar />
      {/if}
    {/if}
  </div>
</div>

<style lang="scss">
  div.file-manager {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    min-width: 0px;
    min-height: 0px;
  }

  div.file-manager.desktop {
    padding: 16px;

    gap: 8px;
  }

  div.file-manager.mobile {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.button-container {
    display: flex;
    flex-direction: row;

    align-items: center;

    padding: 4px 8px;
    gap: 4px;
  }

  div.main-view {
    display: flex;
    flex-direction: column;

    flex-grow: 1;

    div.main-view-error {
      > pre {
        overflow: auto;
      }
    }
  }

  div.main-view.desktop {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);

    padding: 8px;
    border-radius: 8px;
  }

  div.main-view.loading {
    justify-content: center;
    align-items: center;
  }

  div.main-view.preview-mode {
    background-color: var(--primary);
    color: var(--onPrimary);
  }

  div.view-row {
    flex-grow: 1;

    display: flex;
    flex-direction: row;
  }
</style>
