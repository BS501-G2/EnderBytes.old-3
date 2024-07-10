<script lang="ts">
  import { Awaiter, Title } from '@rizzzi/svelte-commons';
  import FileBrowser, { type FileBrowserState } from '../file-browser.svelte';
  import { writable, type Writable } from 'svelte/store';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import { authentication } from '$lib/client/auth';

  const fileBrowserState: Writable<FileBrowserState> = writable({ isLoading: true });
  const errorStore: Writable<Error | null> = writable(null);

  const {
    funcs: { listStarred }
  } = getConnection();

  const starred = writable<FileResource[]>([]);
  const ended = writable(false);
</script>

<Title title="Starred" />

<Awaiter
  callback={async () => {
    $fileBrowserState = {
      isLoading: false,
      files: await listStarred($authentication, 0),
      title: 'Starred',
    };
  }}
></Awaiter>

{#if $errorStore == null}
  <FileBrowser {fileBrowserState} />
{/if}
