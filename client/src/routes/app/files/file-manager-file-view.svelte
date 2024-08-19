<script lang="ts" context="module">
  export interface Data {
    mime: [mime: string, description: string];
    viruses: string[];
  }
</script>

<script lang="ts">
  import { getConnection } from '$lib/client/client';
  import Icon from '$lib/ui/icon.svelte';
  import { FileType } from '@rizzzi/enderdrive-lib/shared';
  import { LoadingSpinner } from '@rizzzi/svelte-commons';

  const { fileId }: { fileId: number } = $props();

  const {
    serverFunctions: { getFileMime, listFileViruses }
  } = getConnection();

  async function load(): Promise<Data> {
    const mime = await getFileMime(fileId);
    const viruses = await listFileViruses(fileId);

    return { mime, viruses };
  }
</script>

{#snippet card(header: string, message: string)}
  <div class="message-card-container">
    <div class="message-card">
      <div class="side">
        <Icon icon="triangle-exclamation" thickness="solid" size="2xl" />
      </div>

      <div class="main">
        <div class="header">
          <h2>{header}</h2>
        </div>
        <div class="message">
          {#each message.split('\n') as messageEntry, index}
            {#if index !== 0}
              <br />
            {/if}

            {messageEntry}
          {/each}
        </div>
      </div>
    </div>
  </div>
{/snippet}

<div class="file-view">
  {#await load() then { mime: [mime, description], viruses }}
    {#if viruses.length > 0}
      {@render card(
        'This file cannot be viewed.',
        'This file cannot be viewed because it contains one or more virus(es):\n' +
          viruses.map((virus, index) => `${index + 1}. ${virus}`).join('\n')
      )}
    {/if}
  {/await}
</div>

<style lang="scss">
  div.file-view {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
  }

  div.message-card-container {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    align-items: center;
    justify-content: safe center;

    overflow: hidden auto;

    min-height: 0px;
    min-width: 0px;

    padding: 8px;
  }

  div.message-card {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);

    display: flex;
    flex-direction: row;
    align-items: center;

    gap: 16px;
    padding: 16px;
    border-radius: 8px;

    > div.side,
    > div.main {
      display: flex;
      flex-direction: column;
    }

    > div.main {
      flex-grow: 1;
    }
  }
</style>
