<script lang="ts" context="module">
</script>

<script lang="ts">
  import {
    Awaiter,
    LoadingSpinner,
    ResponsiveLayout,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import {
    FileManagerContentName,
    FileManagerContextName,
    FileManagerPage,
    type FileManagerContent,
    type FileManagerContentContext,
    type FileManagerContext
  } from './file-manager.svelte';
  import { getConnection } from '$lib/client/client';
  import type { FileResource, UserResource } from '@rizzzi/enderdrive-lib/server';
  import { getContext, type Snippet } from 'svelte';
  import { writable, type Writable } from 'svelte/store';

  const {
    props,
    props: { onFileId },

    addressBarMenu,

    refreshKey
  } = getContext<FileManagerContext & { props: { page: FileManagerPage.Files } }>(
    FileManagerContextName
  );

  const content = getContext<Writable<FileManagerContentContext>>(FileManagerContentName);
</script>

{#snippet rootFile(me: UserResource, file: FileResource | null = null)}
  <div class="root-card">
    <button
      onclick={(event) => {
        if (props.page !== FileManagerPage.Files) {
          return;
        }

        if (props.fileId) {
          props.onFileId?.(event, file?.id ?? null);
        }
      }}
    >
      <p>
        {#if file?.ownerUserId != me.id}
          <i class="fa-solid fa-user-group" style="font-size: 1em;"></i>
        {:else}
          <i class="fa-solid fa-folder" style="font-size: 1em;"></i>
        {/if}
        <ResponsiveLayout>
          {#snippet desktop()}
            {file?.ownerUserId === me.id && file.parentFileId == null
              ? 'My Files'
              : (file?.name ?? 'Unknown')}
          {/snippet}
        </ResponsiveLayout>
      </p>
    </button>
  </div>
{/snippet}

{#snippet entryFile(parent: FileResource | null, file: FileResource)}
  <div
    class="entry"
    class:desktop={$viewMode & ViewMode.Desktop}
    class:mobile={$viewMode & ViewMode.Mobile}
  >
    <button
      class="arrow"
      onclick={({ currentTarget }) => {
        $addressBarMenu = [currentTarget, parent?.id ?? null];
      }}
    >
      <ResponsiveLayout>
        {#snippet desktop()}
          <i class="fa-solid fa-caret-right"></i>
        {/snippet}
        {#snippet mobile()}
          <i class="fa-solid fa-chevron-right"></i>
        {/snippet}
      </ResponsiveLayout>
    </button>

    <button
      class="name"
      onclick={(event) => {
        onFileId?.(event, file.id);
      }}>{file.name}</button
    >
  </div>
{/snippet}

{#snippet main(me: UserResource, files: FileResource[])}
  {@const root = files[0]}
  {@const chain = files.slice(1)}

  {@render rootFile(me, root)}

  <div class="separator"></div>

  {#each chain as entry, index}
    {@const entryParent = index > 0 ? chain[index - 1] : null}

    {@render entryFile(entryParent, entry)}
  {/each}
{/snippet}

{#snippet getFiles(view: Snippet<[me: UserResource, files: FileResource[]]>)}
  {#key $refreshKey}
    <Awaiter
      callback={async (): Promise<FileManagerContent | null> => {
        if ($content == null) {
          return null;
        }

        return await $content;
      }}
    >
      {#snippet success({ result })}
        {#if result != null && result.page === 'files'}
          {@const { me, filePathChain } = result}

          {@render view(me, filePathChain)}
        {/if}
      {/snippet}

      {#snippet loading()}
        <div class="loading">
          <LoadingSpinner size="1.2em" />

          <p>Loading...</p>
        </div>
      {/snippet}
    </Awaiter>
  {/key}
{/snippet}

<div
  class="container"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <ResponsiveLayout>
    {#snippet mobile()}
      <div class="mobile-bar">
        <div class="inner">
          {@render getFiles(main)}
        </div>
      </div>
    {/snippet}

    {#snippet desktop()}
      <div class="desktop-bar">
        {@render getFiles(main)}
      </div>
    {/snippet}
  </ResponsiveLayout>
</div>

<style lang="scss">
  div.container {
    overflow: hidden;
  }

  div.container.desktop {
    border-radius: 8px;

    min-height: calc(1.2em + 24px);
  }

  div.container.mobile {
    min-height: calc(1.2em + 25px);
  }

  div.mobile-bar {
    display: flex;
    flex-direction: row;

    align-items: center;

    min-height: calc(24px + 1.2em);
    max-height: calc(24px + 1.2em);

    overflow: auto;

    max-lines: 1;
    text-overflow: clip;
    text-wrap: nowrap;

    border-bottom: solid 1px var(--primaryContainer);

    div.inner {
      margin: 8px;

      display: flex;
      flex-direction: row;

      flex-grow: 1;
    }
  }

  div.desktop-bar {
    display: flex;
    flex-direction: row;

    align-items: center;

    min-height: calc(1.2em + 8px);
    max-height: calc(1.2em + 8px);

    padding: 8px;

    max-lines: 1;
    overflow: auto;
    text-wrap: nowrap;

    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.loading {
    display: flex;
    flex-direction: row;

    gap: 8px;

    align-items: center;
  }

  div.root-card {
    // background-color: var(--primary);
    // color: var(--onPrimary);
    border-radius: 4px;

    overflow: hidden;

    > button {
      background-color: unset;
      color: unset;
      border: none;

      width: 100%;
      height: 100%;

      padding: 4px 8px;
    }

    > button:hover {
      background-color: #ffffff7f;

      cursor: pointer;
    }

    > button:hover {
      background-color: var(--primaryContainer);
      color: var(--onPrimaryContainer);
    }

    > button:active {
      background-color: var(--primary);
      color: var(--onPrimary);
    }
  }

  div.separator {
    min-width: 1px;
    max-width: 1px;

    background-color: var(--primaryContainer);

    margin: 0px 4px;
  }

  div.entry {
    display: flex;
    flex-direction: row;

    align-items: center;
    line-height: 1.2em;

    border-radius: 4px;

    overflow: hidden;

    > button {
      display: flex;
      flex-direction: row;
      align-items: center;

      background-color: unset;
      color: inherit;
      border: none;
      border: solid 1px transparent;

      line-height: 1.2em;
      padding: 4px 4px;
    }
  }

  div.entry.mobile {
    > button:focus,
    > button:active {
      background-color: var(--primary);
      color: var(--onPrimary);
    }
  }

  div.entry.desktop:hover {
    background-color: var(--background);

    > button:hover {
      background-color: var(--primaryContainer);
      color: var(--onPrimaryContainer);

      cursor: pointer;
    }

    > button:active {
      background-color: var(--primary);
      color: var(--onPrimary);
    }
  }
</style>
