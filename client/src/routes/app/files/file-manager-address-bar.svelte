<script lang="ts" context="module">
</script>

<script lang="ts">
  import { Awaiter, ResponsiveLayout, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import {
    FileManagerContextName,
    FileManagerPage,
    type FileManagerContext
  } from './file-manager.svelte';
  import { getConnection } from '$lib/client/client';
  import type { FileResource, UserResource } from '@rizzzi/enderdrive-lib/server';
  import { getContext, type Snippet } from 'svelte';

  const {
    props,
    props: { fileId }
  } = getContext<FileManagerContext & { props: { page: FileManagerPage.Files } }>(
    FileManagerContextName
  );

  const {
    serverFunctions: { getFilePathChain, getFile, whoAmI }
  } = getConnection();

  async function get(): Promise<[me: UserResource, files: FileResource[]]> {
    if (props.page !== FileManagerPage.Files) {
      throw new Error('Not available in page');
    }

    const user = (await whoAmI())!;
    const file = await getFile($fileId);
    const filePathChain = await getFilePathChain(file.id);

    return [user, filePathChain];
  }
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
    <button class="arrow" onclick={() => {}}>
      <ResponsiveLayout>
        {#snippet desktop()}
          <i class="fa-solid fa-caret-right"></i>
        {/snippet}
        {#snippet mobile()}
          <i class="fa-solid fa-chevron-right"></i>
        {/snippet}
      </ResponsiveLayout>
    </button>

    <button class="name">{file.name}</button>
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
  {#key props.fileId}
    <Awaiter callback={get}>
      {#snippet success({
        result: [me, files]
      }: {
        result: [me: UserResource, files: FileResource[]];
      })}
        {@render view(me, files)}
      {/snippet}
    </Awaiter>
  {/key}
{/snippet}

<div class="container" class:desktop={$viewMode & ViewMode.Desktop}>
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

    min-height: calc(1.2em + 8px);
    max-height: calc(1.2em + 8px);

    padding: 8px;

    max-lines: 1;
    overflow: auto;
    text-wrap: nowrap;

    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
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
