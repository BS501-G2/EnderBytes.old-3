<script lang="ts" context="module">
  import { ResponsiveLayout } from '@rizzzi/svelte-commons';
  import type { ControlBarItem } from './-file-browser/desktop/main-panel/control-bar.svelte';
  import type { FileAccessResource } from '@rizzzi/enderdrive-lib/server';
  import { type FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';

  export interface FileAccessListInfo {
    highestLevel: FileAccessLevel;
    accessPoint: FileAccessResource;
    list: FileAccessResource[];
  }

  export interface FilePathChainInfo {
    root: FileResource;
    chain: FileResource[];

    isForeign: boolean;
  }

  export interface FileClipboard {
    ownerUserId: number;

    files: FileResource[];
    isCut: boolean;
  }

  export type FileBrowserState = {
    title?: string;
    controlBarActions?: ControlBarItem[];

    isLoading: boolean;
    file?: FileResource;
    access?: FileAccessListInfo;
    pathChain?: FilePathChainInfo;
    files?: FileResource[];
  };

  export const fileClipboard: Writable<FileClipboard | null> = writable(null);
</script>

<script lang="ts">
  import DesktopLayout from './-file-browser/desktop.svelte';
  import MobileLayout from './-file-browser/mobile.svelte';
  import { writable, type Writable } from 'svelte/store';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  const {
    fileBrowserState,
    selection = writable([])
  }: { fileBrowserState: Writable<FileBrowserState>; selection?: Writable<FileResource[]> } =
    $props();
</script>

{#key $fileBrowserState}
  {(selection.set([]), '')}
{/key}

<ResponsiveLayout>
  {#snippet desktop()}
    <DesktopLayout fileBrowserState={fileBrowserState as any} {selection} />
  {/snippet}
  {#snippet mobile()}
    <MobileLayout fileBrowserState={fileBrowserState as any} />
  {/snippet}
</ResponsiveLayout>
