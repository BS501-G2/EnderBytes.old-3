<script lang="ts" context="module">
  export type FileManagerAction = {
    name: string;
    icon: string;

    type: 'new' | 'modify' | 'arrange';

    action: (event: MouseEvent) => Promise<void>;
  };
</script>

<script lang="ts">
  import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import FileManagerSeparator from './file-manager-separator.svelte';
  import { getContext } from 'svelte';
  import {
    FileManagerContextName,
    FileManagerPropsName,
    type FileManagerContext,
    type FileManagerProps
  } from './file-manager.svelte';
  import { FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { derived, writable } from 'svelte/store';

  const props = getContext<FileManagerProps>(FileManagerPropsName);
  const { refresh } = props;
  const { resolved } = getContext<FileManagerContext>(FileManagerContextName);

  function getActions(selection: FileResource[]): FileManagerAction[] {
    const actions: FileManagerAction[] = [];

    if (selection.length > 0) {
      actions.push({
        name: `Delete ${selection.length} item${selection.length > 1 ? 's' : ''}`,
        icon: 'fa-solid fa-trash',
        type: 'modify',
        action: async (event) => {
          if (props.page === 'files') {
            // props.onDelete(selection, event);
          }
        }
      });
    }

    if ($resolved.status === 'success') {
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

  const selected =
    $resolved.status === 'success' && !($resolved.page === 'files' && $resolved.type === 'file')
      ? $resolved.selection
      : writable([]);

  const actions = derived(selected, (selected) => {
    const actions = getActions(selected);
    const newActions = actions.filter((action) => action.type === 'new');
    const modifyActions = actions.filter((action) => action.type === 'modify');
    const arrangeActions = actions.filter((action) => action.type === 'arrange');

    // return [actions.filter((action) => action.type === 'new'), actions.filter((action) => action.type === 'modify'), actions.filter((action) => action.type === 'arrange')];

    return {
      newActions,
      modifyActions,
      arrangeActions
    };
  });
</script>

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

    {#key $selected}
      {@render list($actions.newActions)}

      {#if $actions.modifyActions.length > 0}
        <FileManagerSeparator orientation="vertical" with-margin />
      {/if}

      {@render list($actions.modifyActions, true)}

      {#if $actions.modifyActions.length > 0}
        <FileManagerSeparator orientation="vertical" with-margin />
      {/if}

      {@render list($actions.arrangeActions)}
    {/key}
</div>

<style lang="scss">
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
