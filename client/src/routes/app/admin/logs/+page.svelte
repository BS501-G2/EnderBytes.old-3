<script lang="ts">
  import { onMount, getContext, type Snippet } from 'svelte';
  import { type AdminContext, AdminContextName } from '../+layout.svelte';
  import { getConnection } from '$lib/client/client';
  import type { FileLogResource } from '@rizzzi/enderdrive-lib/server';
  import { FileLogType } from '@rizzzi/enderdrive-lib/shared';
  import { LoadingSpinner } from '@rizzzi/svelte-commons';
  import User from '$lib/client/user.svelte';
  import Action from './action.svelte';

  const { setMainContent, pushTopContent } = getContext<AdminContext>(AdminContextName);

  interface Data {
    logs: FileLogResource[];
  }

  onMount(() => setMainContent(main));
  onMount(() => pushTopContent(top));

  const {
    serverFunctions: { listFileLogs, getFile }
  } = getConnection();

  async function load(): Promise<Data> {
    const logs = await listFileLogs();

    return { logs };
  }

  let logs: FileLogResource[] = $state([]);
  let logsFinal: boolean = $state(false);

  let listElement: HTMLDivElement = $state(null as never);
  let listScroll: number = $state(0);
  let promise: Promise<void> | null = $state(null);

  function updateScroll() {
    const { scrollTop, scrollHeight, offsetHeight } = listElement;

    listScroll = scrollHeight - offsetHeight * 2 - scrollTop;
  }

  async function loadLogs(): Promise<void> {
    const newEntries = await listFileLogs(undefined, undefined, logs.length, 100);

    if (newEntries.length === 0) {
      logsFinal = true;
    }

    logs.push(...newEntries);
    logs = logs;
  }

  $effect(() => {
    if (listScroll <= 0 && !logsFinal) {
      void (async () => {
        try {
          await (promise ??= loadLogs());
        } finally {
          promise = null;
        }

        updateScroll();
      })();
    }
  });
</script>

{#snippet top()}
  <div class="title">
    <h2>Logs</h2>
  </div>
{/snippet}

{#snippet main()}
  <div bind:this={listElement} class="action-list" onscroll={updateScroll}>
    {#each logs as log}
      <!-- {@render action(log)} -->

      <Action {log} include-file />
    {/each}
  </div>
{/snippet}

<style lang="scss">
  div.action-list {
    display: flex;
    flex-direction: column;

    min-height: 0px;

    overflow: hidden auto;

    gap: 8px;
  }

  div.title {
    display: flex;
    flex-direction: row;
  }
</style>
