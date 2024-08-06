<script lang="ts">
  import { getContext } from 'svelte';
  import { fly } from 'svelte/transition';
  import { type FileManagerContext, FileManagerContextName } from './file-manager.svelte';
  import { writable, type Writable } from 'svelte/store';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import FileManagerDetails from './file-manager-details.svelte';

  const { resolved } = getContext<FileManagerContext>(FileManagerContextName);

  const selection: Writable<FileResource[]> =
    $resolved.status !== 'success' ? writable([]) : $resolved.selection;
</script>

<div class="side-bar" transition:fly={{ duration: 250, x: 16 }}>
  {#if $selection.length !== 1}
    <div class="empty-selection">
      <i class="fa-solid fa-folder-open"></i>
      <p>{$selection.length} selected</p>
    </div>
  {:else}
    {#key $selection}
      <FileManagerDetails file={$selection[0]} embedded />
    {/key}
  {/if}
</div>

<style lang="scss">
  div.side-bar {
    display: flex;
    flex-direction: column;

    min-width: 256px;
    max-width: 256px;
    min-height: 0px;

    padding: 8px;
    padding-left: 16px;

    overflow: auto;
  }

  div.empty-selection {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: center;

    gap: 8px;

    > i {
      font-size: 64px;
      color: var(--shadow);
    }
  }
</style>
