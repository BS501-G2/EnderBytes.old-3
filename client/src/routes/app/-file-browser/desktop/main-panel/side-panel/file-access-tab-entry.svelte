<script lang="ts">
  import { Awaiter, Button, LoadingSpinner } from '@rizzzi/svelte-commons';
  import UserComponent from '$lib/client/user.svelte';
  import type { Snippet } from 'svelte';

  import type { FileAccessResource, FileResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import { getAuthentication } from '$lib/client/auth';
  import { FileAccessLevel, UserResolveType } from '@rizzzi/enderdrive-lib/shared';

  const {
    file,
    access,
    reload
  }: { file: FileResource; access: FileAccessResource; reload: () => void } = $props();
</script>

<Awaiter
  callback={async () => {
    const {
      funcs: { getUser }
    } = getConnection();

    return await getUser(getAuthentication(), [UserResolveType.UserId, access.userId]);
  }}
>
  {#snippet success({ result: user })}
    <div class="user">
      <div class="user-info">
        <UserComponent user={user!} initials hyperlink={false} />
      </div>
      <div class="user-actions">
        <select
          onchange={async ({ currentTarget }) => {
            const {
              funcs: { grantAccessToUser }
            } = getConnection();

            await grantAccessToUser(
              getAuthentication(),
              file.id,
              user!.id,
              Number.parseInt(currentTarget.value) as FileAccessLevel
            );
            reload();
          }}
        >
          <option selected={access.level === FileAccessLevel.Read} value={FileAccessLevel.Read}>
            Read
          </option>
          <option
            selected={access.level === FileAccessLevel.ReadWrite}
            value={FileAccessLevel.ReadWrite}
          >
            Read & Write
          </option>
          <option selected={access.level === FileAccessLevel.Manage} value={FileAccessLevel.Manage}>
            Manage
          </option>
        </select>
        <Button
          container={buttonContainer}
          onClick={() => {
            const {
              funcs: { revokeAccessFromUser }
            } = getConnection();

            revokeAccessFromUser(getAuthentication(), file.id, user!.id);
            reload();
          }}
          hint="Revoke"
        >
          <i class="icon fa-solid fa-trash"></i>
        </Button>
      </div>
    </div>
  {/snippet}
  {#snippet loading()}
    <LoadingSpinner size="1em" />
  {/snippet}
</Awaiter>

{#snippet buttonContainer(view: Snippet)}
  <div class="button">
    {@render view()}
  </div>
{/snippet}

<style lang="scss">
  div.user {
    display: flex;
    flex-direction: row;
    gap: 8px;

    align-items: center;

    > div.user-info {
      flex-grow: 1;

      min-width: 0px;
      overflow: hidden;
      text-overflow: ellipsis;
      max-lines: 1;
    }

    > div.user-actions {
      display: flex;
      flex-direction: row;
      gap: 8px;

      > select {
        padding: 4px;
      }
    }
  }
</style>
