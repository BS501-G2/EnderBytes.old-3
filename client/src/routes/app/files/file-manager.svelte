<script lang="ts" context="module">
  export enum FileManagerMode {
    FileExplorer,
    FileBrowser
  }

  export enum FileManagerPage {
    Files = 'files',
    Shared = 'shared',
    Starred = 'starred',
    Trash = 'trash'
  }

  export type FileManagerOnPageCallback = (page: FileManagerPage) => void;
  export type FileManagerOnFileIdCallback = (fileId: number | null) => void;
  export type FileManagerProps = {
    selection: Writable<number[]>;
    mode: FileManagerMode;

    onPage?: FileManagerOnPageCallback;
  } & (
    | {
        page: FileManagerPage.Files;

        fileId: number | null;
        onFileId: FileManagerOnFileIdCallback;
      }
    | {
        page: FileManagerPage.Shared | FileManagerPage.Starred | FileManagerPage.Trash;
      }
  );
</script>

<script lang="ts">
  import { goto } from '$app/navigation';

  import Card from '$lib/ui/card.svelte';
  import { ResponsiveLayout, ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import type { Writable } from 'svelte/store';
  import AddressBar from './address-bar.svelte';
  import FileList from './file-list.svelte';
  import SelectionBar from './selection-bar.svelte';

  const { ...props }: FileManagerProps = $props();
  const { selection } = props;

  const onPage: FileManagerOnPageCallback =
    props.onPage ??
    ((page) => {
      goto('/app/files/' + page);
    });
</script>

<div
  class="file-manager"
  class:desktop={($viewMode & ViewMode.Desktop) !== 0}
  class:mobile={($viewMode & ViewMode.Mobile) !== 0}
>
  <ResponsiveLayout>
    {#snippet mobile()}
      {#if props.page === FileManagerPage.Files}
        <AddressBar {...props} />
      {/if}

      <FileList {...props} />

      {#if $selection.length}
        <SelectionBar {...props} />
      {/if}
    {/snippet}
    {#snippet desktop()}
      {#if props.page === FileManagerPage.Files}
        <AddressBar {...props} />
      {/if}

      <FileList {...props} />

      {#if $selection.length}
        <SelectionBar {...props} />
      {/if}
    {/snippet}
  </ResponsiveLayout>
</div>

<style lang="scss">
  div.file-manager {
    min-height: 100%;
    max-height: 100%;

    display: flex;
    flex-direction: column;
  }

  div.file-manager.desktop {
    background-color: var(--background);
    color: var(--onBackground);

    padding: 16px;
  }

  div.file-manager.mobile {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }
</style>
