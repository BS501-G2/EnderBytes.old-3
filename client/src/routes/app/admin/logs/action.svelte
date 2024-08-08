<script lang="ts">
  import { goto } from '$app/navigation';
  import { getConnection } from '$lib/client/client';
  import User from '$lib/client/user.svelte';
  import type { FileLogResource } from '@rizzzi/enderdrive-lib/server';
  import { FileLogType, FileType } from '@rizzzi/enderdrive-lib/shared';
  import { LoadingSpinner } from '@rizzzi/svelte-commons';

  const {
    log,
    'include-file': includeFile = false
  }: { log: FileLogResource; 'include-file'?: boolean } = $props();
  const {
    serverFunctions: { adminGetFile }
  } = getConnection();
</script>

<div
  class="action"
>
  <div class="side">
    <img src="/favicon.svg" alt="logo" />
  </div>

  <div class="main">
    <p>
      <User userId={log.actorUserId} /> performed <b>{FileLogType[log.type]}</b> action.
    </p>

    {#if includeFile}
      <button class="file" onclick={() => goto(`/app/files?fileId=${log.targetFileId}`)}>
        {#await adminGetFile(log.targetFileId)}
          <LoadingSpinner size="1em" />
        {:then file}
          {#if file.type === FileType.Folder}
            <i class="fa-solid fa-folder"></i>
          {:else if file.type === FileType.File}
            <i class="fa-solid fa-file"></i>
          {/if}

          <p>{file.name}</p>
        {/await}
      </button>
    {/if}
  </div>
</div>

<style lang="scss">
  div.action {
    display: flex;
    flex-direction: row;

    padding: 0px 16px;
    gap: 8px;

    > div.side {
      img[alt='logo'] {
        width: 32px;
        height: 32px;
      }
    }

    > div.main {
      flex-grow: 1;

      display: flex;
      flex-direction: column;

      gap: 8px;

      > button.file {
        display: flex;
        flex-direction: row;

        // border: solid 1px var(--shadow);
        background-color: var(--background);
        color: var(--onBackground);
        border: none;

        border-radius: 8px;
        gap: 8px;
        padding: 16px;

        align-items: center;

        > i {
          font-size: 24px;
        }
      }

      > button.file:hover {
        // background-color: var(--backgroundVariant);
        // color: var(--onBackgroundVariant);

        cursor: pointer;

        > p {
          text-decoration: underline;
        }
      }
    }
  }
</style>
