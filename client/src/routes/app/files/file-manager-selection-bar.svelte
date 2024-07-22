<script lang="ts">
  import { getContext } from 'svelte';
  import {
    FileManagerContextName,
    type FileManagerContext,
    type FileManagerProps
  } from './file-manager.svelte';

  const {} = getContext<FileManagerContext>(FileManagerContextName);
</script>
