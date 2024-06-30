<script lang="ts">
  import {
    Awaiter,
    Banner,
    BannerClass,
    Button,
    Title,
    type AwaiterResetFunction
  } from '@rizzzi/svelte-commons';
  import FileBrowser, { type FileBrowserState } from '../file-browser.svelte';
  import { writable, type Writable } from 'svelte/store';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import { getAuthentication } from '$lib/client/auth';

  let refresh: Writable<AwaiterResetFunction<null>> = writable();
  const fileBrowserState: Writable<FileBrowserState> = writable({ isLoading: true });
  const errorStore: Writable<Error | null> = writable(null);

  const {
    funcs: { listSharedFiles, getFile }
  } = getConnection();
</script>

<Awaiter
  bind:reset={$refresh}
  callback={async (): Promise<void> => {
    $fileBrowserState = { isLoading: true };

    try {
      const fileAccesses = await listSharedFiles(getAuthentication());

      $fileBrowserState = {
        isLoading: false,
        files: await Promise.all(
          fileAccesses.map((fileAccess) => getFile(getAuthentication(), fileAccess.fileId))
        ),
        title: 'Shared Files'
      };
    } catch (error: any) {
      $errorStore = error;
      throw error;
    }
  }}
>
  {#snippet error({ error })}
    <Banner bannerClass={BannerClass.Error}>
      <div class="error-banner">
        <p class="message">{error.name}: {error.message}</p>
        <Button onClick={() => $refresh(true)}>
          <p class="retry">Retry</p>
        </Button>
      </div>
    </Banner>
  {/snippet}
</Awaiter>

{#if $errorStore == null}
  <FileBrowser {fileBrowserState} />
{/if}
