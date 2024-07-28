<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { DashboardContextName, type DashboardContext } from '../dashboard.svelte';
  import FileManager, {
    type FileManagerOnPageCallback,
    type FileManagerOnFileIdCallback
  } from '../files/file-manager.svelte';
  import { Title } from '@rizzzi/svelte-commons';
  import { goto } from '$app/navigation';

  const { setMainContent } = getContext<DashboardContext>(DashboardContextName);

  const refresh: Writable<() => void> = writable(null as never);

  const onPage: FileManagerOnPageCallback = (...[, page]) => {
    goto(`/app/${page}`);
  };

  const onFileId: FileManagerOnFileIdCallback = (...[, newFileId]) => {
    goto(`/app/files${newFileId != null ? `?fileId=${newFileId}` : ''}`);
  };

  onMount(() => setMainContent(layout));
</script>

<Title title="Starred" />

{#snippet layout()}
  <FileManager page="starred" {onPage} {onFileId} {refresh} />
{/snippet}
