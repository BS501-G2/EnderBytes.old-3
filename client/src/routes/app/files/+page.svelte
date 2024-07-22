<script lang="ts">
  import { derived, writable, type Writable } from 'svelte/store';
  import FileManager, {
    FileManagerMode,
    FileManagerPage,
    type FileManagerOnViewCallback,
    type FileManagerOnNewCallback,
    type FileManagerOnFileIdCallback
  } from './file-manager.svelte';
  import FileManagerNew from './file-manager-new.svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '$lib/client/client';
  import { executeBackgroundTask } from '$lib/background-task.svelte';
  import { byteUnit } from '$lib/shared/utils';

  const selection: Writable<number[]> = writable([]);

  page.subscribe(console.log);

  const fileId = derived(page, ({ url: { searchParams } }) => {
    try {
      const fileId = Number.parseInt(searchParams.get('fileId') ?? '') || null;

      return fileId;
    } catch (error) {
      return null;
    }
  });

  const onNew: FileManagerOnNewCallback = (event) => {
    $newDialog = [event.currentTarget];
  };

  const onView: FileManagerOnViewCallback = (event) => {
    console.log(event);
  };

  const onFileId: FileManagerOnFileIdCallback = (event, fileId) => {
    goto(`/app/files${fileId != null ? `?fileId=${fileId}` : null}`);
  };

  const newDialog: Writable<[sourceElement: HTMLButtonElement] | null> = writable(null);

  const {
    serverFunctions: { createFolder, createFile, feedUploadBuffer, getFile }
  } = getConnection();

  async function onCreateFile(files: File[]) {
    if (files.length === 0) {
      return;
    }

    const task = executeBackgroundTask(
      files.length === 1 ? `File Upload: ${files[0].name}` : `Upload ${files.length} file(s)`,
      true,
      async (_, setStatus) => {
        const parentFolder = await getFile($fileId);
        const bufferSize = 1024 * 1024;

        const newFiles: FileResource[] = [];

        const totalBytes = files.reduce((total, current) => total + current.size, 0);
        let uploadedBytes = 0;
        let uploadedFiles = 0;

        let errors: [file: File, error: Error][] = []

        for (const file of Array.from(files)) {
          let currentUploaded = 0;

          for (let offset = 0; offset < file.size; offset += bufferSize) {
            const buffer = file.slice(offset, Math.min(offset + bufferSize, file.size));

            await feedUploadBuffer(new Uint8Array(await buffer.arrayBuffer()));

            uploadedBytes += buffer.size;
            currentUploaded += buffer.size;

            setStatus(
              `${uploadedFiles}/${files.length}: Uploading ${file.name}... (${byteUnit(currentUploaded)}/${byteUnit(file.size)})`,

              uploadedBytes / totalBytes
            );
          }

          uploadedFiles++;
          newFiles.push(await createFile(parentFolder.id, file.name));
        }

        setStatus('Process Completed.');

        $refresh();
      }
    );

    $newDialog = null;

    await task.run();
  }

  async function onCreateFolder(name: string) {
    const task = executeBackgroundTask(`New Folder: ${name}`, true, async (_, setStatus) => {
      const parentFolder = await getFile($fileId);
      setStatus('Creating a folder...');
      const newFolder = await createFolder(parentFolder.id, name);

      setStatus('Completed.');
      onFileId(null, newFolder.id);
    });

    $newDialog = null;

    await task.run();
  }

  const refresh: Writable<() => void> = writable(null as never);
</script>

<FileManager
  mode={FileManagerMode.FileExplorer}
  page={FileManagerPage.Files}
  {selection}
  {fileId}
  {onNew}
  {onView}
  {onFileId}
  {refresh}
/>

{#if $newDialog != null}
  <FileManagerNew
    anchor={$newDialog[0]}
    onDismiss={() => ($newDialog = null)}
    {onCreateFile}
    {onCreateFolder}
  />
{/if}
