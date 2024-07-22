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
  import { get, writable, type Writable } from 'svelte/store';
  import { getConnection } from '$lib/client/client';

  const { props, mobileSelectMode, desktopSelectMode, sidePanel, onRefresh } =
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

  const refreshKey = writable<number>(0);

  onRefresh.update((onRefresh) => {
    onRefresh.push(() => {
      refreshKey.update((value) => {
        value + 1;

        return value;
      });
    });

    return onRefresh;
  });
</script>

{#snippet fileList()}
  {#key $refreshKey}
    <Awaiter callback={loadFiles}>
      {#snippet success({ result }: { result: FileResource[] })}{/snippet}
      {#snippet loading()}
        <p>loading</p>
      {/snippet}
    </Awaiter>
  {/key}
{/snippet}

<ResponsiveLayout>
  {#snippet desktop()}
    <div class="list desktop">
      {@render fileList()}
    </div>
  {/snippet}

  {#snippet mobile()}
    <div class="list mobile">
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
