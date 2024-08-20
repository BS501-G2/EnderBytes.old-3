<script lang="ts" context="module">
  import { getConnection } from '$lib/client/client';
  import type {
    FileAccessResource,
    FileResource,
    UserResource
  } from '@rizzzi/enderdrive-lib/server';
</script>

<script lang="ts">
  import User from '$lib/client/user.svelte';
  import {
    Awaiter,
    Button,
    ButtonClass,
    Dialog,
    Input,
    InputType,
    LoadingSpinner,
    Overlay,
    OverlayPositionType
  } from '@rizzzi/svelte-commons';
  import { writable, type Writable } from 'svelte/store';
  import { onDestroy, type Snippet } from 'svelte';
  import { FileAccessLevel, UserResolveType } from '@rizzzi/enderdrive-lib/shared';
  import Icon from '$lib/ui/icon.svelte';

  const {
    serverFunctions: { listFileAccess, listUsers, setUserAccess, getUser, whoAmI, getMyAccess }
  } = getConnection();

  const { resolve, file }: { resolve: () => void; file: FileResource } = $props();

  const search: Writable<string> = writable('');

  let searchBox: HTMLDivElement = $state(null as never);
  let refreshKey: number = $state(0);

  $effect(() => {
    if (searchBox == null) {
      $search = '';
    }
  });
</script>

<Dialog onDismiss={resolve}>
  {#snippet head()}
    <h2>Manage Access for "{file.name}"</h2>
  {/snippet}

  {#snippet body()}
    <div class="access-dialog">
      <div class="search" bind:this={searchBox}>
        <Input
          type={InputType.Text}
          name="Search"
          value={search}
          placeholder="Search of users..."
          icon="fa-solid fa-search"
        />
      </div>

      <h3>Existing access</h3>

      {#await getUser([UserResolveType.UserId, file.ownerUserId])}
        <LoadingSpinner size="1em" />
      {:then user}
        {@render userRow(user)}
      {/await}

      {#key refreshKey}
        {#await (async () => {
          const accesses = await listFileAccess(file.id);

          const out: [access: FileAccessResource, user: UserResource][] = [];

          for (const access of accesses) {
            const user = await getUser([UserResolveType.UserId, access.userId]);
            out.push([access, user]);
          }

          return out;
        })()}
          <LoadingSpinner size="1em" />
        {:then accesses}
          {#if accesses.length === 0}
            <p>No access other users found.</p>
          {/if}

          {#each accesses as [access, user]}
            {@render userRow(user, access)}
          {/each}
        {/await}
      {/key}
    </div>
  {/snippet}
</Dialog>

{#if $search.length > 0}
  <Overlay
    position={[
      OverlayPositionType.Offset,
      searchBox?.offsetLeft ?? 0,
      (searchBox?.offsetTop ?? 0) + (searchBox?.offsetHeight ?? 0)
    ]}
    onDismiss={() => ($search = '')}
  >
    <div class="search-result">
      {#key $search}
        <Awaiter
          callback={async () => {
            const users = await listUsers({ searchString: $search });

            for (let index = 0; index < users.length; index++) {
              if (users[index].id === file.ownerUserId) {
                users.splice(index--, 1);
                continue;
              }
            }

            return users;
          }}
        >
          {#snippet success({ result: users })}
            {#if users.length === 0}
              <p>No users found.</p>
            {/if}

            {#each users as user}
              <div class="user-row">
                <Button
                  onClick={async () => {
                    await setUserAccess(file.id, user.id, FileAccessLevel.Read);
                    $search = '';
                  }}
                  outline={false}
                  buttonClass={ButtonClass.Transparent}
                  container={buttonContainer}
                >
                  <div class="user-entry">
                    <!-- <i class="fa-solid fa-user"></i> -->
                    <Icon icon="user" thickness="solid"></Icon>
                    <p>
                      <User hyperlink={false} {user} initials></User>
                    </p>
                  </div>
                </Button>
              </div>
            {/each}
          {/snippet}
        </Awaiter>
      {/key}
    </div>
  </Overlay>
{/if}

{#snippet buttonContainer(view: Snippet)}
  <div class="button-container">{@render view()}</div>
{/snippet}

{#snippet userRow(user: UserResource, access?: FileAccessResource)}
  <div class="user-row list-entry">
    <div class="user-icon"></div>
    <div class="user-name">
      <User hyperlink={false} {user} initials></User>
    </div>
    <div class="user-access">
      {#if access != null}
        {#await getMyAccess(access.fileId) then { level }}
          {#if level >= FileAccessLevel.Manage}
            <select
              onchange={async ({ currentTarget: { value } }) => {
                const level: FileAccessLevel = Number(value) as FileAccessLevel;

                await setUserAccess(file.id, user.id, level);
                refreshKey++;
              }}
            >
              {@render option(FileAccessLevel.None)}
              {@render option(FileAccessLevel.Read)}
              {@render option(FileAccessLevel.ReadWrite)}
              {@render option(FileAccessLevel.Manage)}
              {@render option(FileAccessLevel.Full)}
            </select>
          {:else}
            <p><i>{FileAccessLevel[access.level]}</i></p>
          {/if}
        {/await}
      {:else}
        <p><i>Owner</i></p>
      {/if}

      {#snippet option(level: FileAccessLevel)}
        <option value={level} selected={level === access?.level}>
          {FileAccessLevel[level]}
        </option>
      {/snippet}
    </div>
  </div>
{/snippet}

<style lang="scss">
  div.button-container {
    padding: 8px;
  }

  div.search {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
  }

  div.access-dialog {
    display: flex;
    flex-direction: column;

    gap: 8px;
  }

  div.search-result {
    display: flex;
    flex-direction: column;

    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);

    padding: 8px;
    border-radius: 8px;
    box-sizing: border-box;
    box-shadow: 2px 2px 8px var(--shadow);

    min-width: 256px;

    overflow: hidden auto;
  }

  div.user-row {
    display: flex;
    flex-direction: column;
  }

  div.user-entry {
    display: flex;
    flex-direction: row;
    gap: 8px;

    align-items: center;

    > p {
      flex-grow: 1;
    }
  }

  div.user-row.list-entry {
    flex-direction: row;

    align-items: center;

    > div.user-name {
      flex-grow: 1;
    }

    > div.user-access {
      > select {
        padding: 8px;
      }
    }
  }
</style>
