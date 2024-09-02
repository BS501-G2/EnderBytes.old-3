<script lang="ts">
  import { getContext } from 'svelte';
  import { FileManagerContextName, type FileManagerContext } from './file-manager.svelte';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  const { resolved } = getContext<FileManagerContext>(FileManagerContextName);

  const files: FileResource[] =
    $resolved.status === 'success' && !($resolved.page === 'files' && $resolved.type === 'file')
      ? $resolved.files
      : [];
</script>

<div class="bottom-bar">
  <p>
    {files.reduce((a, b) => {
      if (b.type === 'file') {
        return a + 1;
      }

      return a;
    }, 0)} file(s),
    {files.reduce((a, b) => {
      if (b.type === 'folder') {
        return a + 1;
      }

      return a;
    }, 0)} folder(s)
  </p>
</div>

<style lang="scss">
  div.bottom-bar {
    display: flex;
    flex-direction: row;

    align-items: center;
    justify-content: space-between;

    padding: 0px 8px;

    min-height: calc(1em + 8px);
    line-height: 0.8em;
    font-size: 0.8em;

    color: var(--shadow);

    font-style: italic;
  }
</style>
