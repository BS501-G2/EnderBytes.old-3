<script lang="ts">
  import { goto } from '$app/navigation';
  import type { Writable } from 'svelte/store';
  import { type FileBrowserState, fileClipboard } from '../../../../file-browser.svelte';
  import { Awaiter, AwaiterResultType } from '@rizzzi/svelte-commons';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import { getAuthentication } from '$lib/client/auth';
  import { FileType } from '@rizzzi/enderdrive-lib/shared';

  let {
    file,
    fileBrowserState,
    onClick,
    selection
  }: {
    fileBrowserState: Writable<FileBrowserState & { isLoading: false }>;
    file: FileResource;
    onClick: (
      fileBrowserState: FileBrowserState & { isLoading: false },
      file: FileResource,
      event: MouseEvent & {
        currentTarget: EventTarget & HTMLButtonElement;
      }
    ) => void;
    selection: Writable<FileResource[]>;
  } = $props();

  const {
    funcs: { readFile, getFileMimeType }
  } = getConnection();
</script>

<button
  class="file-entry{$selection.includes(file) ? ' selected' : ''}{$fileClipboard != null &&
  $fileClipboard.isCut &&
  $fileClipboard.files.find((f) => f.id === file.id)
    ? ' cut'
    : ''}"
  onclick={(event) => {
    event.preventDefault();

    onClick($fileBrowserState, file, event);
  }}
  ondblclick={(event) => {
    event.preventDefault();

    goto(`/app/files?id=${file.id}`);
  }}
>
  <Awaiter
    callback={async () => {
      const fileContent = await readFile(getAuthentication(), file.id);
      const url = URL.createObjectURL(
        new Blob([fileContent], { type: await getFileMimeType(getAuthentication(), file.id) })
      );

      return url;
    }}
  >
    {#snippet children(state)}
      <img
        class="thumbnail"
        alt="Thumbnail"
        src={state.status === AwaiterResultType.Success ? state.result : ''}
      />
    {/snippet}
  </Awaiter>

  <p class="name">
    <i class="fa-regular {file.type === FileType.Folder ? 'fa-folder' : 'fa-file'}"></i>
    <span class="name">
      {file.name}
    </span>
  </p>
</button>

<style lang="scss">
  button.file-entry {
    cursor: pointer;

    display: flex;
    flex-direction: column;

    padding: 8px;
    gap: 8px;

    background-color: var(--background);
    color: var(--onBackground);

    border: 1px solid transparent;
    border-radius: 0.5em;

    text-decoration: none;

    > img.thumbnail {
      min-width: 100%;
      max-width: 100%;
      aspect-ratio: 5/4;

      object-fit: contain;
      border-radius: 0.25em;

      background-color: var(--backgroundVariant);
    }

    > p.name {
      min-width: 100%;
      max-width: 100%;

      display: flex;
      flex-direction: row;
      align-items: center;

      gap: 8px;

      > span.name {
        text-overflow: ellipsis;
        text-wrap: nowrap;
        overflow: hidden;
        line-height: 1em;
      }
    }
  }

  button.file-entry:hover {
    border: 1px solid var(--onBackgroundVariant);
  }

  button.file-entry.cut {
    background-color: var(--shadow);
  }

  button.file-entry.selected {
    background-color: var(--primary);
    color: var(--onPrimary);
  }
</style>
