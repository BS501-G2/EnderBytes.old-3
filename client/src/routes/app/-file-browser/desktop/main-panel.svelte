<script lang="ts">
  import type { Writable } from 'svelte/store';
  import type { FileBrowserState } from '../../file-browser.svelte';
  import ControlBar from './main-panel/control-bar.svelte';
  import FileList from './main-panel/file-list.svelte';
  import FileView from './main-panel/file-view.svelte';
  import PathChain from './main-panel/path-chain.svelte';
  import { FileType } from '@rizzzi/enderdrive-lib/shared';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  let {
    fileBrowserState,
    selection
  }: { fileBrowserState: Writable<FileBrowserState>; selection: Writable<FileResource[]> } =
    $props();
</script>

<div class="main-panel">
  {#if $fileBrowserState.isLoading || $fileBrowserState?.pathChain != null}
    <PathChain fileBrowserState={fileBrowserState as any} />
  {/if}

  {#if $fileBrowserState.file != null && $fileBrowserState.file.type === FileType.Folder}
    <ControlBar fileBrowserState={fileBrowserState as any} {selection} />
  {/if}

  <div class="inner-panel">
    {#if $fileBrowserState.isLoading || $fileBrowserState.file?.type !== FileType.File}
      <FileList fileBrowserState={fileBrowserState as any} {selection} />
    {:else}
      <FileView fileBrowserState={fileBrowserState as any} {selection} />
    {/if}
  </div>
</div>

<style lang="scss">
  div.main-panel {
    display: flex;
    flex-direction: column;
    flex-grow: 1;

    min-width: 0px;
    min-height: 0px;

    gap: 16px;

    > div.inner-panel {
      flex-grow: 1;
      min-height: 0px;
      min-width: 0px;

      display: flex;
      flex-direction: column-reverse;
    }
  }
</style>
