<script lang="ts">
  import { derived, writable, type Writable } from 'svelte/store';
  import FileManager, {
    type FileManagerOnClipboardCallback,
    type FileManagerOnFileIdCallback,
    type FileManagerOnNewCallback,
    type FileManagerOnPageCallback
  } from './file-manager.svelte';
  import FileManagerNew from './file-manager-new.svelte';
  import { getConnection } from '$lib/client/client';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { executeBackgroundTask } from '$lib/background-task.svelte';
  import { byteUnit } from '@rizzzi/enderdrive-lib/shared';
  import { getContext, onMount } from 'svelte';
  import { DashboardContextName, type DashboardContext } from '../dashboard.svelte';
  import { Title } from '@rizzzi/svelte-commons';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  const { setMainContent } = getContext<DashboardContext>(DashboardContextName);

  const {
    serverFunctions: { getFile, createFile, createFolder, feedUploadBuffer }
  } = getConnection();

  const refresh: Writable<() => void> = writable(null as never);
  const fileId = derived(page, ({ url: { searchParams } }) => {
    try {
      const fileId = Number.parseInt(searchParams.get('fileId') ?? '') || null;

      return fileId;
    } catch (error) {
      return null;
    }
  });

  const onPage: FileManagerOnPageCallback = (...[, page]) => {
    goto(`/app/${page}`);
  };

  const onFileId: FileManagerOnFileIdCallback = (...[, newFileId]) => {
    goto(`/app/files${newFileId != null ? `?fileId=${newFileId}` : ''}`);
  };

  const onNew: FileManagerOnNewCallback = (event) => {
    $newDialog = [event.currentTarget as HTMLElement];
  };

  const onClipboard: FileManagerOnClipboardCallback = (event, files, cut) => {
    if (files == null) {
      $clipboard = null;
    } else {
      $clipboard = [files, cut];
    }
  };

  const newDialog: Writable<[element: HTMLElement] | null> = writable(null);
  const clipboard: Writable<[files: FileResource[], cut: boolean] | null> = writable(null);

  const uploadNewFiles = (files: File[]): void => {
    const task = executeBackgroundTask(
      'File Upload',
      true,
      async (_, setStatus) => {
        const updateStatus = (
          index: number,
          name: string,
          currentUploaded: number,
          currentTotal: number,
          uploaded: number,
          total: number
        ) => {
          setStatus(
            `${index + 1}/${files.length}: ${name} (${byteUnit(currentUploaded)}/${byteUnit(currentTotal)})`,
            uploaded / total
          );
        };

        const parentFile = await getFile($fileId);

        const bufferSize = 1024 * 1024;

        const total = files.reduce((total, file) => total + file.size, 0);
        let uploaded = 0;

        for (let index = 0; index < files.length; index++) {
          const { [index]: file } = files;

          updateStatus(index, file.name, 0, file.size, uploaded, total);

          for (let offset = 0; offset < file.size; offset += bufferSize) {
            const buffer = file.slice(offset, offset + bufferSize);

            updateStatus(index, file.name, offset + buffer.size, file.size, uploaded, total);

            await feedUploadBuffer(new Uint8Array(await buffer.arrayBuffer()));
          }

          await createFile(parentFile.id, file.name);
        }

        setStatus('Task Completed', 1);
      },
      false
    );

    $newDialog = null;
    void task.run();
  };

  const createNewFolder = (name: string): void => {
    const task = executeBackgroundTask(
      `New Folder: ${name}`,
      true,
      async (_, setStatus) => {
        setStatus('Creating Folder');

        const parentFile = await getFile($fileId);
        await createFolder(parentFile.id, name);

        setStatus('Task Completed', 1);
      },
      false
    );

    $newDialog = null;
    void task.run();
  };

  onMount(() => setMainContent(layout));
</script>

<Title title="My Files" />

{#snippet layout()}
  <FileManager
    page="files"
    {refresh}
    {onPage}
    {onFileId}
    {onNew}
    {onClipboard}
    {fileId}
    {clipboard}
  />

  {#if $newDialog != null}
    <FileManagerNew
      element={$newDialog[0]}
      onDismiss={() => {
        $newDialog = null;
      }}
      {uploadNewFiles}
      {createNewFolder}
    />
  {/if}
{/snippet}
