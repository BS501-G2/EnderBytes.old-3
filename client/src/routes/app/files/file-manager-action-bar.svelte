<script lang="ts" context="module">
  export type FileManagerAction = {
    name: string;
    icon: string;

    type: 'new' | 'modify' | 'arrange';

    action: (event: MouseEvent) => Promise<void>;
  };
</script>

<script lang="ts">
  import { LoadingSpinner, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import FileManagerSeparator from './file-manager-separator.svelte';
  import { getContext, onMount } from 'svelte';
  import {
    FileManagerContextName,
    FileManagerPropsName,
    type FileManagerContext,
    type FileManagerProps
  } from './file-manager.svelte';
  import { FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { derived, get, writable, type Writable } from 'svelte/store';
  import { DashboardContextName, type DashboardContext } from '../dashboard.svelte';
  import { getConnection } from '$lib/client/client';
  import { deleteConfirm } from './file-manager-delete-confirm.svelte';
  import { openDetails } from './file-manager-details-dialog.svelte';

  const props = getContext<FileManagerProps>(FileManagerPropsName);
  const { refresh } = props;
  const { resolved, viewDialog } = getContext<FileManagerContext>(FileManagerContextName);
  const {
    serverFunctions: { copyFile, moveFile, trashFile, getFile, setFileStar, isFileStarred }
  } = getConnection();

  async function getActions(selection: FileResource[]): Promise<FileManagerAction[]> {
    console.log('ads');

    const actions: FileManagerAction[] = [];
    if ($resolved.status === 'success') {
      if ($viewMode & ViewMode.Desktop) {
        actions.push({
          name: 'View',
          icon: 'fa-solid fa-eye',
          type: 'arrange',
          action: async (event) => {
            $viewDialog = [event.currentTarget as HTMLElement];
          }
        });
      }

      if ($selected.length > 0) {
        let starred: boolean = true;

        for (const file of $selected) {
          if (!(await isFileStarred(file.id))) {
            starred = false;
            break;
          }
        }

        actions.push({
          name: `${starred ? 'Uns' : 'S'}tar`,
          icon: `fa-${starred ? 'solid' : 'regular'} fa-star`,
          type: 'modify',
          action: async () => {
            await Promise.all($selected.map((file) => setFileStar(file.id, !starred)));

            $actionsKey = Math.random();

            if (props.page === 'starred') {
              $refresh();
            }
          }
        });
      }

      if ($resolved.page === 'files' && props.page === 'files' && $clipboard == null) {
        if ($selected.length > 0 && $resolved.myAccess.level > FileAccessLevel.Read) {
          actions.push({
            name: 'Copy',
            icon: 'fa-solid fa-copy',
            type: 'modify',
            action: async (event) => {
              if (props.page === 'files') {
                props.onClipboard(event, $selected, false);
                $selected = [];
              }
            }
          });

          if ($resolved.myAccess.level > FileAccessLevel.ReadWrite) {
            actions.push({
              name: 'Cut',
              icon: 'fa-solid fa-scissors',
              type: 'modify',
              action: async (event) => {
                if (props.page === 'files') {
                  props.onClipboard(event, $selected, true);
                  $selected = [];
                }
              }
            });

            actions.push({
              name: 'Delete',
              icon: 'fa-solid fa-trash',
              type: 'modify',
              action: async () => {
                const files = [...$selected];
                if (await deleteConfirm(files)) {
                  await trashFile(files.map((file) => file.id));
                  $selected = [];
                  $refresh();
                }
              }
            });
          }
        }

        if (props.page === 'files' && $clipboard != null) {
          actions.push({
            name: 'Cancel',
            icon: 'fa-solid fa-xmark',
            type: 'modify',
            action: async (event) => {
              props.onClipboard(event, null, false);
            }
          });

          actions.push({
            name: 'Paste',
            icon: 'fa-solid fa-paste',
            type: 'modify',
            action: async () => {
              const parentFolder = await getFile($fileId);

              if ($clipboard![1]) {
                await moveFile(
                  $clipboard![0].map((file) => file.id),
                  parentFolder.id
                );
              } else {
                await copyFile(
                  $clipboard![0].map((file) => file.id),
                  parentFolder.id
                );
              }

              $clipboard = null;
              $refresh();
            }
          });
        }

        if ($selected.length === 1 && $clipboard == null && $viewMode & ViewMode.Mobile) {
          actions.push({
            name: 'Properties',
            icon: 'fa-solid fa-info',
            type: $viewMode & ViewMode.Mobile ? 'arrange' : 'modify',
            action: async (event) => {
              if (props.page === 'files') {
                await openDetails($selected[0]);
              }
            }
          });
        }
      }

      if ($viewMode & ViewMode.Desktop) {
        if (
          $resolved.page === 'files' &&
          $resolved.type === 'folder' &&
          $resolved.myAccess.level >= FileAccessLevel.ReadWrite
        ) {
          actions.push({
            name: 'New',
            icon: 'fa-solid fa-plus',
            type: 'new',
            action: async (event) => {
              if (props.page === 'files') {
                props.onNew(event);
              }
            }
          });
        }

        actions.push({
          name: 'Refresh',
          icon: 'fa-solid fa-rotate',
          type: 'arrange',
          action: async () => {
            $refresh?.();
          }
        });
      }
    } else if ($resolved.status === 'error') {
      actions.push({
        name: 'Retry',
        icon: 'fa-solid fa-rotate',
        type: 'new',
        action: async () => {
          $refresh?.();
        }
      });
    } else if ($resolved.status === 'loading') {
    }

    return actions;
  }

  const selected = $resolved.status === 'success' ? $resolved.selection : writable([]);

  const fileId = props.page === 'files' ? props.fileId : writable(null);

  const clipboard = props.page === 'files' ? props.clipboard : writable(null);

  const { addContextMenuEntry } = getContext<DashboardContext>(DashboardContextName);

  const newActions = (actions: FileManagerAction[]) =>
    actions.filter((action) => action.type === 'new');
  const modifyActions = (actions: FileManagerAction[]) =>
    actions.filter((action) => action.type === 'modify');
  const arrangeActions = (actions: FileManagerAction[]) =>
    actions.filter((action) => action.type === 'arrange');

  if ($viewMode & ViewMode.Mobile) {
    onMount(() =>
      addContextMenuEntry('Configure File Manager', 'fa-solid fa-eye', (event) => {
        $viewDialog = [event.currentTarget as HTMLElement];
      })
    );

    onMount(() =>
      addContextMenuEntry('New', 'fa-solid fa-plus', (event) => {
        if (props.page === 'files') {
          props.onNew(event);
        }
      })
    );

    onMount(() =>
      addContextMenuEntry('Refresh', 'fa-solid fa-rotate', () => {
        $refresh?.();
      })
    );
  }

  const actionsKey: Writable<number> = writable(0);
</script>

{#snippet layout(originalList: FileManagerAction[])}
  {#if originalList.length > 0}
    <div
      class="action-bar"
      class:mobile={$viewMode & ViewMode.Mobile}
      class:desktop={$viewMode & ViewMode.Desktop}
    >
      {#snippet list(actions: FileManagerAction[], grow: boolean = false)}
        {#snippet inner()}
          {#each actions as { name, icon, action }}
            <button
              class="action"
              class:mobile={$viewMode & ViewMode.Mobile}
              class:desktop={$viewMode & ViewMode.Desktop}
              onclick={action}
            >
              <i class={icon}></i>
              <p>{name}</p>
            </button>
          {/each}
        {/snippet}

        {#if $viewMode & ViewMode.Desktop}
          <div class="desktop-group" class:grow>
            {@render inner()}
          </div>
        {:else if $viewMode & ViewMode.Mobile}
          {@render inner()}
        {/if}
      {/snippet}

      {#snippet lista()}
        {@const newList = newActions(originalList)}
        {@const modifyList = modifyActions(originalList)}
        {@const arrangeList = arrangeActions(originalList)}

        {#if newList.length !== 0}
          {@render list(newList)}
        {/if}

        {#if modifyList.length !== 0 && newList.length !== 0}
          <FileManagerSeparator orientation="vertical" with-margin />
        {/if}

        {@render list(modifyActions(originalList), true)}

        {#if modifyList.length !== 0 && arrangeList.length !== 0}
          <FileManagerSeparator orientation="vertical" with-margin />
        {/if}

        {#if arrangeList.length > 0}
          {@render list(arrangeList)}
        {/if}
      {/snippet}

      {@render lista()}
    </div>
  {/if}
{/snippet}

{#key $fileId}
  {#key $selected}
    {#key $clipboard}
      {#key $actionsKey}
        {#await getActions($selected)}
          <div class="loading-bar">
            <LoadingSpinner size="1.2em" />
          </div>
        {:then actions}
          {@render layout(actions)}
        {/await}
      {/key}
    {/key}
  {/key}
{/key}

<style lang="scss">
  div.loading-bar {
    display: flex;
    flex-direction: row;

    align-items: center;

    margin: 0px 8px;

    min-height: calc(32px + 1em);
  }

  div.action-bar {
    display: flex;
    flex-direction: row;

    min-height: calc(32px + 1em);
  }

  div.action-bar.desktop {
    padding: 4px 8px;

    gap: 8px;

    box-sizing: border-box;
  }

  div.desktop-group {
    display: flex;
  }

  div.desktop-group.grow {
    flex-grow: 1;
  }

  button.action {
    display: flex;

    align-items: center;
    line-height: 1em;

    background-color: transparent;
    color: inherit;
    border: none;
  }

  button.action.desktop {
    flex-direction: row;

    gap: 8px;
    border-radius: 8px;
    padding: 0px 8px;
  }

  button.action.mobile {
    flex-direction: column;

    justify-content: center;

    flex-grow: 1;

    > i {
      font-size: 1.5em;
    }
  }

  button.action.desktop:hover {
    background-color: var(--background);
    color: var(--onBackground);

    cursor: pointer;
  }

  button.action.desktop:active,
  button.action.mobile:active {
    background-color: var(--primary);
    color: var(--onPrimary);
  }
</style>
