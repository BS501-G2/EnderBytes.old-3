<script lang="ts">
  import {
    Awaiter,
    Banner,
    BannerClass,
    Button,
    Input,
    InputType,
    LoadingSpinner,
    type AwaiterResetFunction
  } from '@rizzzi/svelte-commons';
  import { writable, type Writable } from 'svelte/store';
  import { type Snippet } from 'svelte';
  import FileAccessTabEntry from './file-access-tab-entry.svelte';
  import type {
    FileAccessResource,
    FileResource,
    UserResource
  } from '@rizzzi/enderdrive-lib/server';
  import { ApiError, FileAccessLevel } from '@rizzzi/enderdrive-lib/shared';
  import User from '$lib/client/user.svelte';
  import { getAuthentication, getConnection } from '$lib/client/client';

  const { file }: { file: FileResource } = $props();

  const userSearch: Writable<string> = writable('');

  let reset: AwaiterResetFunction<void> | undefined = $state();
  let toGrant: [user: UserResource, accessLevel: FileAccessLevel] | null = null;

  const toGrantError: Writable<Error | null> = writable(null);
  const addNewUser: Writable<boolean> = writable(false);

  const {
    serverFunctions: { setUserAccess, listFileAccess, listUsers }
  } = getConnection();
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
        await setUserAccess(file.id, toGrant[0].id, toGrant[1]);
      } catch (error: unknown) {
        if (error instanceof ApiError) {
          $toGrantError = new Error('User has already been granted access.');
        } else {
          $toGrantError = error as Error;
        }
      }

      toGrant = null;
    }

    return await listFileAccess(file.id);
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

    {#if file.ownerUserId === getAuthentication()?.userId || list.find((access: FileAccessResource) => access.level >= FileAccessLevel.Manage)}
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
                const users = await listUsers({ searchString: $userSearch || undefined });

                return users;
              }}
            >
              {#snippet success({ result: users })}
                {#each users as user}
                  {#if list.find((access) => access.userId === user.id) === undefined}
                    <div class="user-result-entry">
                      <div class="link">
                        <User {user} initials hyperlink={false} />
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
