<script lang="ts" module>
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import { writable, type Writable } from 'svelte/store';

  export type FileManagerDeleteConfirmDialogs = {
    files: FileResource[];

    resolve: (result: boolean) => void;
  }[];

  export function deleteConfirm(files: FileResource[]): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      dialogs.update((dialogsArray) => {
        const entry: FileManagerDeleteConfirmDialogs[0] = {
          files,
          resolve: (result) => {
            resolve(result);

            dialogs.update((dialogsArray) => {
              dialogsArray.splice(dialogsArray.indexOf(entry), 1);

              return dialogsArray;
            });
          }
        };

        dialogsArray.push(entry);
        return dialogsArray;
      });
    });
  }

  const dialogs: Writable<FileManagerDeleteConfirmDialogs> = writable([]);
</script>

<script lang="ts">
  import { Button, Dialog } from '@rizzzi/svelte-commons';
  import { type Snippet } from 'svelte';
</script>

{#snippet buttonContainer(view: Snippet)}
  <div class="button-container">
    {@render view()}
  </div>
{/snippet}

{#snippet layout(index: number)}
  {@const { files, resolve } = $dialogs[index]}

  <Dialog dialogClass='normal' onDismiss={() => resolve(false)}>
    {#snippet head()}
      <h2>Delete {files.length} file{files.length > 1 ? 's' : ''}</h2>
    {/snippet}

    {#snippet body()}
      <p>Are you sure you want to delete {files.length} file{files.length > 1 ? 's' : ''}?</p>
    {/snippet}

    {#snippet actions()}
      <Button container={buttonContainer as Snippet} onClick={() => resolve(true)}>Yes</Button>
      <Button container={buttonContainer as Snippet} buttonClass='transparent' onClick={() => resolve(false)}>No</Button>
    {/snippet}
  </Dialog>
{/snippet}

{#each $dialogs as _, index}
  {@render layout(index)}
{/each}

<style lang="scss">
  div.button-container {
    margin: 8px;
  }
</style>
