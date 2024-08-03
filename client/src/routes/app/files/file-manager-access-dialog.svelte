<script lang="ts" context="module">
  import { getConnection } from '$lib/client/client';
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';

  interface DialogEntry {
    file: FileResource;

    resolve: () => void;
  }

  export function openAccess(file: FileResource): Promise<void> {
    return new Promise<void>((resolve) => {
      dialogs.update((dialogsArray) => {
        const entry: DialogEntry = {
          file,
          resolve: () => {
            dialogs.update((dialogsArray) => {
              dialogsArray.splice(dialogsArray.indexOf(entry), 1);
              return dialogsArray;
            });

            resolve();
          }
        };

        dialogsArray.push(entry);
        return dialogsArray;
      });
    });
  }

  const dialogs: Writable<DialogEntry[]> = writable([]);
</script>

<script lang="ts">
  import { Awaiter, Dialog } from '@rizzzi/svelte-commons';
  import { writable, type Writable } from 'svelte/store';

  const {
    serverFunctions: { listFileAccess }
  } = getConnection();

  async function list(file: FileResource) {
    const accesses = await listFileAccess(file.id);

    return accesses;
  }
</script>

{#snippet layout(index: number)}
  {@const { file, resolve } = $dialogs[index]}

  <Dialog onDismiss={resolve}>
    {#snippet head()}
      <h2>File Access</h2>
    {/snippet}

    {#snippet body()}
      <Awaiter callback={() => list(file)}>
        {#snippet success({ result })}

        {/snippet}
      </Awaiter>
    {/snippet}
  </Dialog>
{/snippet}

{#each $dialogs as _, index}
  {@render layout(index)}
{/each}

<style lang="scss">
</style>
