<script lang="ts">
  import { derived, writable, type Writable } from 'svelte/store';
  import FileManager, { FileManagerMode, FileManagerPage } from './file-manager.svelte';
  import { page } from '$app/stores';

  const selection: Writable<number[]> = writable([]);
  const fileId = derived(
    page,
    ({
      url: {
        searchParams: { get: param }
      }
    }) => {
      try {
        return Number.parseInt(param('fileId') ?? '') || null;
      } catch {
        return null;
      }
    }
  );
</script>

<FileManager
  mode={FileManagerMode.FileExplorer}
  page={FileManagerPage.Files}
  {selection}
  fileId={$fileId}
/>
