<script lang="ts">
  import { getContext } from 'svelte';
  import {
    type FileViewContext,
    FileViewContextName,
    type FileViewData
  } from './file-manager-file-view.svelte';

  const { file, mime }: FileViewData = $props();
  const mimeType = mime[0];

  const {} = getContext<FileViewContext>(FileViewContextName);
</script>

<div class="file-content">

</div>

<style lang="scss">
  div.file-content {
    flex-grow: 1;
    display: flex;
  }
</style>
