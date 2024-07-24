<script lang="ts">
  import type { UserResource, FileResource } from '@rizzzi/enderdrive-lib/server';
  import {
    Button,
    ButtonClass,
    LoadingSpinner,
    ResponsiveLayout,
    viewMode,
    ViewMode
  } from '@rizzzi/svelte-commons';
  import { getContext, type Snippet } from 'svelte';
  import {
    FileManagerContextName,
    type FileManagerProps,
    FileManagerPropsName,
    type FileManagerContext
  } from './file-manager.svelte';
  import FileManagerSeparator from './file-manager-separator.svelte';

  const { onFileId } = getContext<FileManagerProps>(FileManagerPropsName);
  const { resolved } = getContext<FileManagerContext>(FileManagerContextName);
</script>

{#snippet buttonContainer(view: Snippet)}
  <div class="button-container">{@render view()}</div>
{/snippet}

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

    <button class="file" class:mobile={$viewMode & ViewMode.Mobile}>{file.name}</button>
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
      <FileManagerSeparator orientation="vertical" with-margin />
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
  <FileManagerSeparator orientation="horizontal" />
{/if}

<style lang="scss">
  div.button-container {
    display: flex;
    flex-direction: row;

    align-items: center;

    padding: 4px 8px;
    gap: 4px;
  }

  div.address-bar {
    display: flex;
    flex-direction: row;

    min-height: calc(24px + 1em);
    line-height: 1em;

    min-width: 0px;
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

    > button.file.mobile {
      border-radius: 4px;
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
</style>
