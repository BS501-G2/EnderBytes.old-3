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
  import { writable, type Readable, type Writable } from 'svelte/store';

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

  export const FileManagerContextName = 'fm-context';
</script>

<script lang="ts">
  import {
    Awaiter,
    Button,
    ButtonClass,
    LoadingSpinner,
    ResponsiveLayout,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import { getConnection } from '$lib/client/client';

  const { ...props }: FileManagerProps = $props();
  const { refresh, onFileId, onPage } = props;

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

  const { refreshKey, resolved } = setContext<FileManagerContext>(FileManagerContextName, {
    refreshKey: writable(0),
    resolved: writable({ status: 'loading' })
  });

  refresh.set(() => refreshKey.update((value) => value + 1));

  const fileId = props.page === 'files' ? props.fileId : writable(null);

  fileId.subscribe(() => $refresh());
</script>

{#key $refreshKey}
  <Awaiter
    callback={async () => {
      $resolved = { status: 'loading' };

      try {
        const me = (await whoAmI())!;

        if (props.page === 'files') {
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

            $resolved = {
              me,
              page: 'files',
              status: 'success',
              file,
              filePathChain,
              myAccess,
              accesses,
              logs,
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
              logs,
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
          const files = await Promise.all(
            starredList.map((starredFile) => getFile(starredFile.id))
          );

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
    }}
  />
{/key}

<ResponsiveLayout>
  {#snippet mobile()}
    <div class="mobile file-manager">
      {@render view()}
    </div>
  {/snippet}

  {#snippet desktop()}
    <div class="desktop file-manager">
      {@render view()}
    </div>
  {/snippet}
</ResponsiveLayout>

{#snippet view()}
  {#if props.page === 'files'}
    {@render addressBar()}
  {/if}
{/snippet}

{#snippet addressBar()}
  {#snippet rootButton(me: UserResource, root: FileResource | null)}
    {@const isLocal = root == null || root.ownerUserId === me.id}

    {#snippet button(icon: string, name: string)}
      <i class="fa-solid {icon}"></i>
      <ResponsiveLayout>
        {#snippet desktop()}
          <p class="address-bar-root-button">{name}</p>
        {/snippet}
      </ResponsiveLayout>
    {/snippet}

    <Button
      onClick={(event) => onFileId(event, null)}
      buttonClass={isLocal ? ButtonClass.Transparent : ButtonClass.Primary}
      outline={false}
      container={buttonContainer}
    >
      {#if isLocal}
        {@render button('fa-regular fa-folder-open', 'My Files')}
      {:else}
        {@render button('fa-solid fa-user-group', root.name)}
      {/if}
    </Button>
  {/snippet}

  {#snippet entryButton(file: FileResource)}
    <div class="address-bar-entry" class:desktop={$viewMode & ViewMode.Desktop}>
      {#if $viewMode & ViewMode.Desktop}
        <button class="arrow">
          <i class="fa-solid fa-chevron-right"></i>
        </button>
      {:else}
        <div class="arrow">
          <i class="fa-solid fa-caret-right"></i>
        </div>
      {/if}

      <button class="file">{file.name}</button>
    </div>
  {/snippet}

  {#snippet view()}
    {#if $resolved.status === 'loading'}
      <div class="address-bar-loading">
        <LoadingSpinner size="1.2em" />
        <p>Loading...</p>
      </div>
    {:else if $resolved.status === 'success' && $resolved.page === 'files'}
      {@const [rootFile, ...filePathChain] = $resolved.filePathChain}

      {@render rootButton($resolved.me, rootFile)}

      {#if filePathChain.length > 0}
        <div class="vertical separator with-margin"></div>
      {/if}

      <div class="address-bar-path-chain">
        {#each filePathChain as entry}
          {@render entryButton(entry)}
        {/each}
      </div>
    {/if}
  {/snippet}

  <div
    class="address-bar"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
  >
    {@render view()}
  </div>

  {#if $viewMode & ViewMode.Mobile}
    <div class="horizontal separator"></div>
  {/if}
{/snippet}

{#snippet buttonContainer(view: Snippet)}
  <div class="button-container">{@render view()}</div>
{/snippet}

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
  }

  div.file-manager.mobile {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.address-bar {
    display: flex;
    flex-direction: row;

    min-height: calc(24px + 1em);
    line-height: 1em;

    min-width: 0px;
  }

  div.address-bar.mobile {
  }

  div.address-bar.desktop {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);

    border-radius: 8px;
  }

  div.address-bar-path-chain {
    display: flex;
    flex-direction: row;
    flex-grow: 1;

    // align-items: center;

    overflow: auto hidden;

    min-width: 0px;

    padding: 0px 8px;
  }

  div.address-bar-loading {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 8px;
    padding: 0px 8px;
  }

  p.address-bar-root-button {
    text-wrap: nowrap;
    max-lines: 1;
  }

  div.address-bar-entry {
    display: flex;
    flex-direction: row;

    // padding: 4px;
    margin: 4px 0px;

    border-radius: 4px;

    > button.file,
    > button.arrow,
    > div.arrow {
      padding: 0px 8px;
      background-color: unset;
      color: inherit;
      border: none;
    }

    > button.arrow,
    > div.arrow {
      display: flex;
      flex-direction: row;

      align-items: center;

      border-radius: 4px 0px 0px 4px;
    }

    > button.arrow:hover {
      background-color: var(--primaryContainer);
      color: var(--onPrimaryContainer);

      cursor: pointer;
    }

    > button.file {
      max-lines: 1;

      text-wrap: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;

      max-width: 128px;

      border-radius: 0px 4px 4px 0px;
    }

    > button.file:hover {
      background-color: var(--primaryContainer);
      color: var(--onPrimaryContainer);

      cursor: pointer;
    }
  }

  div.address-bar-entry.desktop:hover {
    background-color: var(--background);
    color: var(--onBackground);

    cursor: pointer;
  }

  div.separator {
    background-color: var(--primaryContainer);
  }

  div.separator.horizontal {
    min-height: 1px;
    max-height: 1px;
  }

  div.separator.horizontal.with-margin {
    margin: 0px 8px;
  }

  div.separator.vertical {
    min-width: 1px;
    max-width: 1px;
  }

  div.separator.vertical.with-margin {
    margin: 8px 0px;
  }

  div.button-container {
    display: flex;
    flex-direction: row;

    align-items: center;

    padding: 4px 8px;
    gap: 4px;
  }
</style>
