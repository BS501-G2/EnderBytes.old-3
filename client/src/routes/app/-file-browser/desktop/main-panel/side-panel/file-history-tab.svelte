<script lang="ts">
    import { authentication, getConnection } from '$lib/client/client';
  import User from '$lib/client/user.svelte';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { FileLogType, UserResolveType } from '@rizzzi/enderdrive-lib/shared';
  import { Awaiter } from '@rizzzi/svelte-commons';
  import Moment from 'moment';

  const { file }: { file: FileResource } = $props();
  const {
    serverFunctions: { listFileLogs, getUser }
  } = getConnection();
</script>

{#key file.id}
  <Awaiter
    callback={async () => {
      return (await listFileLogs(file.id))
        .toSorted((log1, log2) => log2.createTime - log1.createTime)
        .filter((log, index, array) => {
          const previousLog = array[index - 1];

          console.table({ previousLog, log });

          return (
            previousLog == null ||
            previousLog.actorUserId !== log.actorUserId ||
            previousLog.type !== log.type
          );
        });
    }}
  >
    {#snippet success({ result })}
      <ul>
        {#each result as snapshot}
          {@const moment = Moment.unix(snapshot.createTime / 1000).fromNow()}

          <li class="history-entry">
            <i class="fa-regular fa-clock"></i>
            <p class="history-description">
              {((type) => {
                switch (type) {
                  case FileLogType.Create:
                    return 'Created';
                  case FileLogType.Modify:
                    return 'Modified';
                  case FileLogType.Access:
                    return 'Accessed';
                  case FileLogType.Delete:
                    return 'Deleted';
                  case FileLogType.Restore:
                    return 'Restored';
                  case FileLogType.Revert:
                    return 'Reverted';
                }
              })(snapshot.type)} by <Awaiter
                callback={async () => {
                  const user = await getUser([
                    UserResolveType.UserId,
                    snapshot.actorUserId
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
