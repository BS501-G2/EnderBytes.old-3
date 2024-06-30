<script lang="ts" context="module">
</script>

<script lang="ts">
  import { writable, type Writable } from 'svelte/store';
  import type { QueryOptions, UserManager, UserResource } from '@rizzzi/enderdrive-lib/server';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';

  import Page from '../+page.svelte';
  import { getAuthentication } from '$lib/client/auth';

  const userQueryOptions: Writable<QueryOptions<UserResource, UserManager>> = writable({
    limit: 10
  });

  const list: Writable<UserResource[]> = writable([]);
  const addToList = (items: UserResource[]) => {
    list.update((value) => {
      value.push(...items);
      return value;
    });

    return $list;
  };

  userQueryOptions.subscribe((value) => {
    list.set([]);
  });

  let noMore: boolean = false;

  async function loadItems(): Promise<void> {
    const {
      funcs: { listUsers }
    } = getConnection();

    if (noMore) {
      return;
    }

    const items = await listUsers(getAuthentication(), {
      ...$userQueryOptions,

      offset: $list.length
    });

    if (items.length === 0) {
      noMore = true;
    }

    addToList(items);
  }
</script>

<Page>
  <div class="panel side-panel"></div>
  <div class="panel main-panel"></div>
</Page>

<style lang="scss">
  div.panel {
    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);

    border-radius: 8px;
  }

  div.main-panel {
    flex-grow: 1;
  }

  div.side-panel {
    min-width: 256px;
    max-width: 256px;
  }
</style>
