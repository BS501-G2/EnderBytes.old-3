<script lang="ts">
  import { Awaiter, ResponsiveLayout, type AwaiterResetFunction } from '@rizzzi/svelte-commons';
  import {
    FileManagerContextName,
    FileManagerPage,
    type FileManagerContext,
    type FileManagerProps
  } from './file-manager.svelte';
  import { getContext, onMount } from 'svelte';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { get, writable, type Readable, type Writable } from 'svelte/store';
  import { getConnection } from '$lib/client/client';

  const { props, mobileSelectMode, desktopSelectMode, sidePanel, refreshKey } =
    getContext<FileManagerContext>(FileManagerContextName);
  const {
    serverFunctions: { scanFolder }
  } = getConnection();

  async function loadFiles(): Promise<FileResource[]> {
    const files: FileResource[] = [];

    if (props.page === FileManagerPage.Files) {
      const result = await scanFolder(get(props.fileId));

      files.push(...result);
    }

    return files;
  }

  const fileId: Readable<number | null> =
    props.page === FileManagerPage.Files ? props.fileId : writable(null);

  let desktopList: HTMLDivElement;

  let mobileList: HTMLDivElement;
</script>

{#snippet fileEntry(file: FileResource)}
  <ResponsiveLayout>
    {#snippet mobile()}
      <a href="?fileId={file.id}">{file.name}</a>
    {/snippet}
    {#snippet desktop()}
      <a href="?fileId={file.id}">{file.name}</a>
    {/snippet}
  </ResponsiveLayout>
{/snippet}

{#snippet fileList()}
  {#key $refreshKey}
    {#key $fileId}
      <Awaiter callback={loadFiles}>
        {#snippet success({ result: files }: { result: FileResource[] })}
          {#each files as file}
            {@render fileEntry(file)}
          {/each}
        {/snippet}
        {#snippet loading()}
          <p>loading</p>
        {/snippet}
      </Awaiter>
    {/key}
  {/key}
{/snippet}

<ResponsiveLayout>
  {#snippet desktop()}
    <div bind:this={desktopList} class="list desktop">
      {@render fileList()}
    </div>
  {/snippet}

  {#snippet mobile()}
    <div bind:this={mobileList} class="list mobile">
      {@render fileList()}
    </div>
  {/snippet}
</ResponsiveLayout>

<style lang="scss">
  div.list {
    flex-grow: 1;

    min-height: 0;

    display: flex;
    flex-direction: column;

    overflow: hidden auto;
  }

  div.list.desktop {
    padding: 4px 4px;
  }

  div.list.mobile {
  }
</style>
