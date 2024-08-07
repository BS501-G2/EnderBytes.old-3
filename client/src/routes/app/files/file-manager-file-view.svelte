<script lang="ts" context="module">
  export interface Data {
    mime: [mime: string, description: string];
  }
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import { type FileManagerContext, FileManagerContextName } from './file-manager.svelte';
  import { getConnection } from '$lib/client/client';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { LoadingSpinner } from '@rizzzi/svelte-commons';

  const { fileId }: { fileId: number } = $props();

  const {
    serverFunctions: { getFileMime }
  } = getConnection();

  async function load(): Promise<Data> {
    const mime = await getFileMime(fileId);

    return { mime };
  }
</script>

<div class="file-view">
  {#await load()}
    <LoadingSpinner size="64px" />
  {:then result}
    <p>asd</p>
    {JSON.stringify(result.mime)}
  {/await}
</div>

<style lang="scss">
  div.file-view {
    flex-grow: 1;
  }
</style>
