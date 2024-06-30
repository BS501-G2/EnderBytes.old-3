<script lang="ts">
  import { page } from '$app/stores';
  import { authentication } from '$lib/client/auth';
  import { UserResolveType, type UserResolvePayload } from '@rizzzi/enderdrive-lib/shared';

  import ProfilePage from './profile-page.svelte';

  const parse = (): UserResolvePayload | null => {
    const idenfierString = $page.url.searchParams.get('id');
    if (idenfierString != null) {
      if (idenfierString.startsWith('@')) {
        return [UserResolveType.Username, idenfierString.substring(1)];
      } else if (idenfierString.startsWith(':')) {
        return [UserResolveType.UserId, Number.parseInt(idenfierString.substring(1))];
      } else if (idenfierString == '!me') {
        return [UserResolveType.UserId, $authentication!.userId];
      }
    }
    return null;
  };

  let resolve: UserResolvePayload | null = $derived(parse());
</script>

{#key resolve}
  {#if resolve != null}
    <ProfilePage {resolve} />
  {:else}
    <pre>
    // TODO: Add all users list
    // Idea:
    //  1. List style with filter options at the top.
  </pre>
  {/if}
{/key}
