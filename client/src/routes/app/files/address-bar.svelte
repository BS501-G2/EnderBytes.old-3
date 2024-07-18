<script lang="ts" context="module">
</script>

<script lang="ts">
  import { Awaiter, ResponsiveLayout, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { FileManagerPage, type FileManagerProps } from './file-manager.svelte';
  import { getConnection } from '$lib/client/client';
  import type { FileResource, UserResource } from '@rizzzi/enderdrive-lib/server';
  import { type Snippet } from 'svelte';

  const { ...props }: FileManagerProps = $props();
  const {
    serverFunctions: { getFilePathChain, getFile, whoAmI }
  } = getConnection();

  async function get(): Promise<[me: UserResource, files: FileResource[]]> {
    if (props.page !== FileManagerPage.Files) {
      throw new Error('Not available in page');
    }

    const user = (await whoAmI())!;
    const file = await getFile(props.fileId);
    const filePathChain = await getFilePathChain(file.id);

    return [user, filePathChain];
  }
</script>

{#snippet rootFile(me: UserResource, file: FileResource | null = null)}
  <div class="root-card">
    <button
      onclick={() => {
        if (props.page !== FileManagerPage.Files) {
          return;
        }

        if (props.fileId) {
          props.onFileId?.(file?.id ?? null);
        }
      }}
    >
      <p>
        <i class="fa-solid fa-folder" style="font-size: 1em;"></i>
        {file?.ownerUserId === me.id && file.parentFileId == null
          ? 'Root File System'
          : file?.name ?? 'Unknown'}
      </p>
    </button>
  </div>
{/snippet}

{#snippet entryFile(parent: FileResource | null, file: FileResource)}
  <div class="entry">
    <div class="arrow">
      <i class="fa-solid fa-caret-right"></i>
    </div>

    <div class="name">{file.name}</div>
  </div>
{/snippet}

{#snippet main(me: UserResource, files: FileResource[])}
  {@const root = files[0]}
  {@const chain = files.slice(1)}

  {#if root.creatorUserId != me.id}
    {@render rootFile(me, root)}
  {/if}

  {#each chain as entry, index}
    {@const entryParent = index > 0 ? chain[index - 1] : null}

    {@render entryFile(entryParent, entry)}
  {/each}
  <div class="entry">
    <div class="arrow">
      <i class="fa-solid fa-caret-right"></i>
    </div>

    <div class="name">Target1</div>
  </div>
  <div class="entry">
    <div class="arrow">
      <i class="fa-solid fa-caret-right"></i>
    </div>

    <div class="name">Target2</div>
  </div>
{/snippet}

{#snippet getFiles(view: Snippet<[me: UserResource, files: FileResource[]]>)}
  <Awaiter callback={get}>
    {#snippet success({ result: [me, files] })}
      {@render view(me, files)}
    {/snippet}
  </Awaiter>
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

    overflow: auto;

    max-lines: 1;
    text-overflow: clip;
    text-wrap: nowrap;

    border-bottom: solid 1px var(--primaryContainer);

    div.inner {
      margin: 8px;
    }
  }

  div.desktop-bar {
    display: flex;
    flex-direction: row;

    padding: 8px;

    max-lines: 1;
    overflow: auto;
    text-wrap: nowrap;

    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.root-card {
    background-color: var(--primary);
    color: var(--onPrimary);
    border-radius: 4px;

    > button {
      background-color: unset;
      color: unset;
      border: none;

      padding: 4px 8px;
    }

    > button:hover {
      background-color: #ffffff7f;

      cursor: pointer;
    }

    > button:active {
      background-color: var(--onPrimary);
      color: var(--primary);
    }
  }

  div.entry {
    display: contents;

    > div.arrow {
    }

    > div.name {
    }
  }
</style>
