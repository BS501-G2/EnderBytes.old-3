<script lang="ts" module>
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { writable, type Writable } from 'svelte/store';

  interface DialogEntry {
    file: FileResource;
    resolve: () => void;
  }

  export function openDetails(file: FileResource): Promise<void> {
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
  import FileManagerDetails from './file-manager-details.svelte';
</script>

{#snippet layout(index: number)}
  {@const { file, resolve } = $dialogs[index]}

  <FileManagerDetails {file} onDismiss={resolve} />
{/snippet}

{#each $dialogs as _, index}
  {@render layout(index)}
{/each}
