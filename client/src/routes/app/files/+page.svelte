<script lang="ts">
  import { derived, writable, type Writable } from 'svelte/store';
  import FileManager, {
    type FileManagerOnFileIdCallback,
    type FileManagerOnPageCallback
  } from './file-manager.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  const refresh: Writable<() => void> = writable(null as never);
  const fileId = derived(page, ({ url: { searchParams } }) => {
    try {
      const fileId = Number.parseInt(searchParams.get('fileId') ?? '') || null;

      return fileId;
    } catch (error) {
      return null;
    }
  });

  const onPage: FileManagerOnPageCallback = (...[, page]) => {
    goto(`/app/${page}`);
  };

  const onFileId: FileManagerOnFileIdCallback = (...[, newFileId]) => {
    goto(`/app/files${newFileId != null ? `?fileId=${newFileId}` : ''}`);
  };
</script>

<FileManager page="files" {refresh} {onPage} {onFileId} {fileId} />
