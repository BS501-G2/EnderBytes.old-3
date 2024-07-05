<script lang="ts">
  import UserName from '$lib/client/user.svelte';
  import { Awaiter, Button, ButtonClass, LoadingSpinner } from '@rizzzi/svelte-commons';
  import { byteUnit } from '$lib/shared/utils';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { authentication, getAuthentication } from '$lib/client/auth';
  import { FileType, UserResolveType } from '@rizzzi/enderdrive-lib/shared';
  import type { Snippet } from 'svelte';
  import VirusScanReportDialog, { pushVirusDialog } from './virus-scan-report-dialog.svelte';

  const { file }: { file: FileResource } = $props();

  const {
    funcs: { getUser, scanFile, getFileSize, getFileMimeType }
  } = getConnection();
</script>

<VirusScanReportDialog />

<div class="container">
  <div class="thumbnail">
    <img alt="Thumbnail" />
  </div>

  <p class="file-name">{file.name}</p>

  <div class="details">
    <div class="details-row">
      <p class="label">Created On</p>
      <p class="value">{new Date(file.createTime).toLocaleString()}</p>
    </div>

    {#if file.createTime != file.createTime}
      <div class="details-row">
        <p class="label">Modified On</p>
        <p class="value">{new Date(file.createTime).toLocaleString()}</p>
      </div>
    {/if}

    <div class="details-row">
      <p class="label">Owned By</p>
      <p class="value">
        {#key file.id}
          <Awaiter
            callback={async () => {
              const user = await getUser($authentication, [
                UserResolveType.UserId,
                file.ownerUserId
              ]);

              return user;
            }}
          >
            {#snippet loading()}
              <LoadingSpinner size="1em" />
            {/snippet}
            {#snippet success({ result })}
              <UserName user={result!} />
            {/snippet}
          </Awaiter>
        {/key}
      </p>
    </div>

    {#if file.type === FileType.File}
      <div class="details-row">
        <p class="label">Size</p>
        <p class="value">
          {#key file.id}
            <Awaiter callback={async () => getFileSize(getAuthentication(), file.id)}>
              {#snippet loading()}
                <LoadingSpinner size="1em" />
              {/snippet}
              {#snippet success({ result })}
                {byteUnit(result)}
              {/snippet}
            </Awaiter>
          {/key}
        </p>
      </div>
      <div class="details-row">
        <p class="label">Type</p>
        <p class="value">
          {#key file.id}
            <Awaiter callback={async () => await getFileMimeType($authentication, file.id, false)}>
              {#snippet loading()}
                <LoadingSpinner size="1em" />
              {/snippet}
              {#snippet success({ result })}
                <span title={result}>
                  {result}
                </span>
              {/snippet}
            </Awaiter>
          {/key}
        </p>
      </div>
      <div class="details-row">
        <p class="label">Virus Scan</p>
        {#key file.id}
          <Awaiter callback={async () => await scanFile($authentication, file.id)}>
            {#snippet loading()}
              <p class="value">
                <LoadingSpinner size="1em" />
              </p>
            {/snippet}
            {#snippet success({ result })}
              <div class="virus-badge" class:bad={result.length !== 0}>
                <Button
                  onClick={() => pushVirusDialog(result)}
                  buttonClass={ButtonClass.Transparent}
                  outline={false}
                >
                  {#if result.length !== 0}
                    <i class="fa-solid fa-bug"></i>
                    <span>Suspicious</span>
                  {:else}
                    <i class="fa-solid fa-question"></i>
                    <span>Undetected</span>
                  {/if}
                </Button>
              </div>
            {/snippet}
          </Awaiter>
        {/key}
      </div>
    {/if}

    {#if file.ownerUserId != file.creatorUserId}
      <div class="details-row">
        <p class="label">Created By</p>
        <p class="value">
          {#key file.id}
            <Awaiter
              callback={async () => {
                const user = await getUser($authentication, [
                  UserResolveType.UserId,
                  file.creatorUserId
                ]);

                return user;
              }}
            >
              {#snippet loading()}
                <LoadingSpinner size="1em" />
              {/snippet}
              {#snippet success({ result })}
                <UserName user={result!} />
              {/snippet}
            </Awaiter>
          {/key}
        </p>
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  div.container {
    display: flex;
    flex-direction: column;
    gap: 16px;

    overflow: hidden auto;
    min-height: 0px;

    > div.thumbnail {
      min-width: 100%;
      aspect-ratio: 5/4;

      > img {
        min-width: 100%;
        min-height: 100%;

        border: 1px solid var(--shadow);

        box-sizing: border-box;
      }
    }

    > div.details {
      display: flex;
      flex-direction: column;
      gap: 8px;

      > div.details-row {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        min-height: 20px;

        > p {
          min-width: 0px;
          overflow: hidden;

          text-overflow: ellipsis;
          text-wrap: nowrap;
        }

        > p.label {
          font-weight: bolder;
        }

        > p.label::after {
          content: ':';
        }

        > p.value {
          text-align: right;

          flex-grow: 1;
        }
      }
    }

    > p.file-name {
      font-weight: bolder;
      text-align: center;

      word-break: break-all;
    }
  }

  div.virus-badge {
    border-radius: 8px;

    display: flex;
    flex-direction: row;
    gap: 4px;

    background-color: var(--primary);
    color: var(--backgroundVariant);
  }

  div.virus-badge.bad {
    background-color: var(--error);
    color: var(--onError);
  }
</style>
