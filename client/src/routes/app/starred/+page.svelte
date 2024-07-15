<script lang="ts">
  import { Awaiter, Title } from '@rizzzi/svelte-commons';
  import FileBrowser, { type FileBrowserState } from '../file-browser.svelte';
  import { writable, type Writable } from 'svelte/store';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '$lib/client/client';

  const fileBrowserState: Writable<FileBrowserState> = writable({ isLoading: true });
  const errorStore: Writable<Error | null> = writable(null);

  const {
    serverFunctions: { listStarred }
  } = getConnection();

  const starred = writable<FileResource[]>([]);
  const ended = writable(false);
</script>

<Title title="Starred" />

<Awaiter
  callback={async () => {
    $fileBrowserState = {
      isLoading: false,
      files: await listStarred(0),
      title: 'Starred'
    };
  }}
></Awaiter>

{#if $errorStore == null}
  <FileBrowser {fileBrowserState} />
{/if}
