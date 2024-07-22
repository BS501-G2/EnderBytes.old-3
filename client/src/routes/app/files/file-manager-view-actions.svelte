<script lang="ts" context="module">
  export interface FileManagerViewAction {
    name: string;
    icon: string;

    category: FileManagerViewActionCategory;

    action: FileManagerViewActionCallback;
  }

  export type FileManagerViewActionCallback = (
    event: MouseEvent & { currentTarget: HTMLButtonElement }
  ) => void | Promise<void>;

  export type FileManagerViewActionGenerator = (
    selection: number[]
  ) => FileManagerViewAction | null | Promise<FileManagerViewAction | null>;

  export enum FileManagerViewActionCategory {
    New,
    FileAction,
    Arrangement
  }
</script>

<script lang="ts">
  import { Awaiter, ResponsiveLayout } from '@rizzzi/svelte-commons';
  import {
    FileManagerContextName,
    FileManagerPage,
    type FileManagerContext,
    type FileManagerProps
  } from './file-manager.svelte';
  import { derived, get, writable, type Writable } from 'svelte/store';
  import { getConnection } from '$lib/client/client';
  import { FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
  import { getContext } from 'svelte';

  const { props, refresh } = getContext<FileManagerContext>(FileManagerContextName);
  const { selection } = props;
  const minPixelCount = 256;

  const {
    serverFunctions: { isFileStarred, getMyAccess, getFile, whoAmI }
  } = getConnection();

  const { mobileSelectMode, desktopSelectMode, onRefresh } =
    getContext<FileManagerContext>(FileManagerContextName);

  const actionCallbacks = derived(
    props.selection,
    (selection): FileManagerViewActionGenerator[] => {
      const actions: FileManagerViewActionGenerator[] = [];

      if (props.page === FileManagerPage.Files) {
        actions.push(async () => {
          const file = await getFile(get(props.fileId));
          const { level } = await getMyAccess(file.id);

          if (level < FileAccessLevel.ReadWrite) {
            return null;
          }

          return {
            name: 'New',
            icon: 'fa-regular fa-plus',
            category: FileManagerViewActionCategory.New,
            action: (event) => {
              if (props.page === FileManagerPage.Files) {
                return props.onNew?.(event);
              }
            }
          };
        });
      }

      if (selection.length) {
        actions.push(async (selection) => {
          const isStarred = (await Promise.all(selection.map(isFileStarred))).reduce(
            (current, value) => value && current,
            true
          );

          return {
            name: 'Star' + (isStarred ? 'red' : ''),
            icon: `fa-${isStarred ? 'solid' : 'regular'} fa-star`,
            category: FileManagerViewActionCategory.FileAction,

            action: () => {}
          };
        });
      }

      actions.push(() => ({
        name: 'Refresh',
        icon: 'fa-solid fa-rotate',
        category: FileManagerViewActionCategory.Arrangement,

        action: () => $refresh()
      }));

      actions.push(() => ({
        name: 'View',
        icon: 'fa-solid fa-filter',
        category: FileManagerViewActionCategory.Arrangement,

        action: (event) => {
          props.onView?.(event);
        }
      }));

      return actions;
    }
  );

  const refreshKey: Writable<number> = writable(0);

  onRefresh.update((onRefresh) => {
    onRefresh.push(() => refreshKey.update((value) => value + 1));

    return onRefresh;
  });
</script>

{#snippet buttons()}
  {#snippet buttonList(actions: FileManagerViewAction[])}
    {#each actions as { name, icon, action }, index}
      <ResponsiveLayout>
        {#snippet desktop()}
          <button class="action desktop" onclick={action}>
            <i class={icon}></i>
            <p>{name}</p>
          </button>
        {/snippet}

        {#snippet mobile()}
          {#if index != 0}
            <div class="separator"></div>
          {/if}

          <button class="action mobile" onclick={action}>
            <i class={icon}></i>
            <p>{name}</p>
          </button>
        {/snippet}
      </ResponsiveLayout>
    {/each}
  {/snippet}

  <Awaiter
    callback={async (): Promise<FileManagerViewAction[]> =>
      (
        await Promise.all(
          $actionCallbacks.map(async (actionCallback) => await actionCallback($selection))
        )
      ).filter((action) => action != null)}
  >
    {#snippet success({ result: actions }: { result: FileManagerViewAction[] })}
      {@const newActions = actions.filter(
        (action) => action.category === FileManagerViewActionCategory.New
      )}
      {@const fileActions = actions.filter(
        (action) => action.category === FileManagerViewActionCategory.FileAction
      )}
      {@const arrangeActions = actions.filter(
        (action) => action.category === FileManagerViewActionCategory.Arrangement
      )}

      <ResponsiveLayout>
        {#snippet desktop()}
          <div class="desktop-view-group">
            {@render buttonList(newActions)}
          </div>
          {#if fileActions.length > 0}
            <div class="separator"></div>
          {/if}
          <div class="desktop-view-group grow">
            {@render buttonList(fileActions)}
          </div>
          <div class="desktop-view-group">
            {@render buttonList(arrangeActions)}
          </div>
        {/snippet}

        {#snippet mobile()}
          {@render buttonList([...newActions, ...fileActions, ...arrangeActions])}
        {/snippet}
      </ResponsiveLayout>
    {/snippet}
  </Awaiter>
{/snippet}

{#snippet key()}
  {#key $refreshKey}
    {#if props.page === FileManagerPage.Files}
      {#key props.fileId}
        {@render buttons()}
      {/key}
    {:else}
      {@render buttons()}
    {/if}
  {/key}
{/snippet}

<ResponsiveLayout>
  {#snippet desktop()}
    <div class="desktop actions">
      {@render key()}
    </div>
  {/snippet}

  {#snippet mobile()}
    <div class="mobile actions">
      {@render key()}
    </div>
  {/snippet}
</ResponsiveLayout>

<style lang="scss">
  div.actions {
    min-height: 32px;

    display: flex;
    flex-direction: row;
  }

  div.actions.desktop {
    padding: 4px 4px;
    gap: 8px;
  }

  div.actions.mobile {
  }

  button.action {
    display: flex;

    align-items: center;
    line-height: 1em;

    background-color: transparent;
    border: none;

    cursor: pointer;
  }

  button.action.desktop {
    flex-direction: row;
    padding: 8px;
    border-radius: 8px;

    gap: 4px;
  }

  button.action.mobile {
    flex-direction: column;

    flex-grow: 1;
    padding: 8px;

    gap: 4px;
  }

  button.action.desktop:hover {
    background-color: var(--background);
    color: var(--onBackground);
  }

  button.action.desktop:active,
  button.action:active {
    background-color: var(--primary);
    color: var(--onPrimary);
  }

  div.separator {
    min-width: 1px;
    max-width: 1px;

    margin: 4px 0px;

    background-color: var(--primaryContainer);
  }

  div.desktop-view-group {
    display: flex;
    flex-direction: row;
  }

  div.desktop-view-group.grow {
    flex-grow: 1;
  }
</style>
