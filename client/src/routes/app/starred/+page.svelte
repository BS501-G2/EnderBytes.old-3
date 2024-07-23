<script lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import FileManager, { FileManagerMode, FileManagerPage } from '../files/file-manager.svelte';

  const selection: Writable<number[]> = writable([]);
  const refresh: Writable<() => void> = writable(null as never);
</script>

<FileManager mode={FileManagerMode.FileExplorer} page={FileManagerPage.Starred} {selection} {refresh} />
