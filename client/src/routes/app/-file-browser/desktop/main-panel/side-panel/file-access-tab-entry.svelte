<script lang="ts">
  import { getUser, grantAccessToUser, revokeAccessFromUser } from '$lib/client/api-functions';
  import { Awaiter, Button, LoadingSpinner } from '@rizzzi/svelte-commons';
  import UserComponent from '$lib/client/user.svelte';
  import type { File } from '$lib/server/db/file';
  import { FileAccessLevel } from '$lib/shared/db';
  import type { Snippet } from 'svelte';
  import type { FileAccess } from '$lib/server/db/file-access';

  const { file, access, reload }: { file: File; access: FileAccess; reload: () => void } = $props();
</script>

<Awaiter
  callback={async () => {
    return await getUser(access.userId);
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
            await grantAccessToUser(file, user!, Number.parseInt(currentTarget.value) as FileAccessLevel);
            reload()
          }}
        >
          <option
            selected={access.accessLevel === FileAccessLevel.Read}
            value={FileAccessLevel.Read}
          >
            Read
          </option>
          <option
            selected={access.accessLevel === FileAccessLevel.ReadWrite}
            value={FileAccessLevel.ReadWrite}
          >
            Read & Write
          </option>
          <option
            selected={access.accessLevel === FileAccessLevel.Manage}
            value={FileAccessLevel.Manage}
          >
            Manage
          </option>
        </select>
        <Button
          container={buttonContainer}
          onClick={() => {
          revokeAccessFromUser(file, user!);
          reload()
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
