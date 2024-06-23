<script lang="ts">
  import type { File } from '$lib/server/db/file';
  import {
    Awaiter,
    Banner,
    BannerClass,
    Button,
    Input,
    InputType,
    LoadingSpinner,
    Overlay,
    type AwaiterResetFunction
  } from '@rizzzi/svelte-commons';
  import { writable, type Writable } from 'svelte/store';
  import { type Snippet } from 'svelte';
  import {
    getAuthentication,
    getUser,
    grantAccessToUser,
    listFileAccess,
    searchUser
  } from '$lib/client/api-functions';
  import type { FileAccess } from '$lib/server/db/file-access';
  import { FileAccessLevel } from '$lib/shared/db';
  import type { User } from '$lib/server/db/user';
  import UserComponent from '$lib/client/user.svelte';
  import { ApiError } from '$lib/shared/api';
  import FileAccessTabEntry from './file-access-tab-entry.svelte';

  const { file }: { file: File } = $props();

  const userSearch: Writable<string> = writable('');

  let reset: AwaiterResetFunction<void> | undefined = $state();
  let toGrant: [user: User, accessLevel: FileAccessLevel] | null = null;

  const toGrantError: Writable<Error | null> = writable(null);
  const addNewUser: Writable<boolean> = writable(false);
</script>

{#snippet buttonContainer(view: Snippet)}
  <div class="button">
    {@render view()}
  </div>
{/snippet}

<Awaiter
  bind:reset
  callback={async () => {
    $toGrantError = null;

    if (toGrant != null) {
      try {
        await grantAccessToUser(file, toGrant[0], toGrant[1]);
      }
      catch(error: unknown) {
        if (error instanceof ApiError) {
          $toGrantError = new Error('User has already been granted access.');
        } else {
          $toGrantError = error as Error;
        }

      }

      toGrant = null;
    }

    return await listFileAccess(file);
  }}
>
  {#snippet success({ result: list })}
    {#each list as access}
      <FileAccessTabEntry
        {file}
        {access}
        reload={() => {
          reset?.(true);
        }}
      />
    {/each}

    {#if (file.ownerUserId === getAuthentication()?.userId) || list.find((access: FileAccess) => access.accessLevel >= FileAccessLevel.Manage)}
      {#if $addNewUser}
        <div class="form">
          <div class="input">
            <Input name="Search For User" type={InputType.Text} value={userSearch} />
            {#key $userSearch}
              {#if $userSearch.length}{/if}
            {/key}
          </div>
        </div>
        {#key $userSearch}
          {#if $userSearch.length}
            <Awaiter
              callback={async () => {
                const users = await searchUser($userSearch);
                return users;
              }}
            >
              {#snippet success({ result: users })}
                {#each users as user}
                  {#if list.find((access) => access.userId === user.id) === undefined}
                    <div class="user-result-entry">
                      <div class="link">
                        <UserComponent {user} initials hyperlink={false} />
                      </div>
                      <Button
                        container={buttonContainer}
                        onClick={async () => {
                          toGrant = [user, FileAccessLevel.Manage];
                          await reset?.(true);
                          $addNewUser = false;
                          $userSearch = '';
                        }}
                      >
                        Grant
                      </Button>
                    </div>
                  {/if}
                {/each}
              {/snippet}
              {#snippet loading()}
                <LoadingSpinner size="1em" />
              {/snippet}
            </Awaiter>
          {/if}
        {/key}
      {:else}
        {#if $toGrantError}
          <Banner bannerClass={BannerClass.Error}>{$toGrantError.message}</Banner>
        {/if}

        <Button
          container={buttonContainer}
          onClick={() => {
            $addNewUser = true;
          }}
        >
          <i class="icon fa-solid fa-plus"></i>
          Grant Access
        </Button>
      {/if}
    {/if}
  {/snippet}
</Awaiter>

<style lang="scss">
  div.button {
    padding: 8px;

    display: flex;
    flex-direction: row;
    gap: 8px;
  }

  div.form {
    max-width: 100%;

    display: flex;
    flex-direction: row;

    gap: 8px;

    overflow: hidden;

    div.input {
      flex-grow: 1;

      overflow: hidden;

      display: flex;
      flex-direction: column;
    }
  }

  div.user-result-entry {
    display: flex;
    flex-direction: row;
    gap: 8px;

    align-items: center;

    > div.link {
      flex-grow: 1;
    }
  }
</style>
