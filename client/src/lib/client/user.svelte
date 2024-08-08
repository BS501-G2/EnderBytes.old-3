<script lang="ts" context="module">
  import type { UserResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from './client';
  import { UserResolveType } from '@rizzzi/enderdrive-lib/shared';

  export enum UserClass {
    Link
  }

  export type UserProps = (
    | {
        user: UserResource;
      }
    | {
        userId: number;
      }
  ) &
    (
      | {
          class: UserClass.Link;
          initials?: boolean;
          hyperlink?: boolean;
        }
      | {
          class?: undefined;
        }
    );
</script>

<script lang="ts">
  const { ...props }: UserProps = $props();

  const {
    serverFunctions: { getUser }
  } = getConnection();
</script>

{#if 'userId' in props}
  {@const { userId } = props}

  {#await getUser([UserResolveType.UserId, userId]) then user}
    <svelte:self
      {...((props) => {
        delete (props as any).userId;

        return props;
      })({ ...props })}
      {user}
    />
  {/await}
{:else if props.class == null}
  <svelte:self {...props} user={props.user} class={UserClass.Link} />
{:else if props.class == UserClass.Link}
  {@const initials = props.initials ?? true}
  {@const hyperlink = props.hyperlink ?? true}

  <a class:nolink={!hyperlink} href={hyperlink ? `/app/users?id=@${props.user.username}` : null}>
    {props.user.lastName}, {initials ? `${props.user.firstName[0]}.` : props.user.firstName}{props
      .user.middleName
      ? ` ${props.user.middleName[0]}.`
      : ''}
  </a>
{/if}

<style lang="scss">
  a {
    text-decoration: none;
    color: inherit;
  }

  a:hover {
    text-decoration: underline;
  }

  a.nolink {
    text-decoration: none;
  }
</style>
