<script lang="ts" context="module">
  import type { User } from '$lib/server/db/user';

  export enum UserClass {
    Link
  }

  export type UserProps = {
    user: User;
  } & (
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
</script>

{#if props.class == null}
  <svelte:self user={props.user} class={UserClass.Link} initials={false} />
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
