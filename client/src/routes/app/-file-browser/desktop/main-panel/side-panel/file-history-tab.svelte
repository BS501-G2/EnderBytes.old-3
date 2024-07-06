<script lang="ts">
  import { authentication } from '$lib/client/auth';
  import User from '$lib/client/user.svelte';
  import { getConnection } from '@rizzzi/enderdrive-lib/client';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { UserResolveType } from '@rizzzi/enderdrive-lib/shared';
  import { Awaiter } from '@rizzzi/svelte-commons';
  import Moment from 'moment';

  const { file }: { file: FileResource } = $props();
  const {
    funcs: { listFileSnapshots, getUser }
  } = getConnection();
</script>

{#key file.id}
  <Awaiter
    callback={async () => {
      const snapshots = await listFileSnapshots($authentication, file.id);

      console.log(snapshots);
      return snapshots;
    }}
  >
    {#snippet success({ result })}
      <ul>
        {#each result as snapshot}
          {@const moment = Moment.unix(snapshot.createTime / 1000).fromNow()}

          <li class="history-entry">
            <i class="fa-regular fa-clock"></i>
            <p class="history-description">
              Created by <Awaiter
                callback={async () => {
                  const user = await getUser($authentication, [
                    UserResolveType.UserId,
                    snapshot.creatorUserId
                  ]);

                  return user!;
                }}
              >
                {#snippet success({ result })}
                  <span style="font-weight: bold;">
                    <User user={result} />
                  </span>
                {/snippet}
              </Awaiter>
              {moment.toString()}
            </p>
          </li>
        {/each}
      </ul>
    {/snippet}
  </Awaiter>
{/key}

<style lang="scss">
  li.history-entry {
    display: flex;
    flex-direction: row;

    gap: 8px;
    align-items: center;

    > p.history-description {
      flex-grow: 1;
    }
  }
</style>
