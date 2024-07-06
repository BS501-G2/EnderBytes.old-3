<script lang="ts">
  import { Title } from '@rizzzi/svelte-commons';
  import FileBrowser, { type FileBrowserState } from '../file-browser.svelte';
  import { writable, type Writable } from 'svelte/store';

  const fileBrowserState: Writable<FileBrowserState> = writable({ isLoading: true });
  const errorStore: Writable<Error | null> = writable(null);
</script>

<Title title="Starred" />

{#if $errorStore == null}
  <FileBrowser {fileBrowserState} />
{/if}
