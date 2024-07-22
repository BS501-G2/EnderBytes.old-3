<script lang="ts" context="module">
  export type FileManagerNewProps = {
    anchor: HTMLButtonElement;

    onDismiss: () => void;

    onCreateFile: (files: File[]) => Promise<void>;
    onCreateFolder: (name: string) => Promise<void>;
  };

  export enum FileManagerNewTab {
    File,
    Folder
  }
</script>

<script lang="ts">
  import { byteUnit } from '$lib/shared/utils';

  import {
    Button,
    ButtonClass,
    createTabId,
    Dialog,
    DialogClass,
    Input,
    InputType,
    Overlay,
    OverlayPositionType,
    ResponsiveLayout,
    Tab,
    viewMode,
    ViewMode,
    type SetTabFunction
  } from '@rizzzi/svelte-commons';
  import type { Snippet } from 'svelte';
  import { writable, type Writable } from 'svelte/store';
  import { fly } from 'svelte/transition';

  const { ...props }: FileManagerNewProps = $props();
  const { onDismiss, onCreateFile, onCreateFolder } = props;

  const newFolderName = writable('');

  const tabId = createTabId<{ actionView: Snippet }>([
    { name: 'New File', view: newFileTab, actionView: newFileTabActions },
    { name: 'New Folder', view: newFolderTab, actionView: newFolderTabActions }
  ]);

  const selectedFiles: Writable<File[]> = writable([]);
  const fileInputElement: Writable<HTMLInputElement | null> = writable(null);
</script>

{#snippet buttonContainer(view: Snippet)}
  <div class="button-container">{@render view()}</div>
{/snippet}

{#snippet newFolderTab()}
  <p>Create new folder.</p>
  <Input name="Folder Name" type={InputType.Text} value={newFolderName} />
{/snippet}

{#snippet newFolderTabActions()}
  <Button onClick={() => onCreateFolder($newFolderName)} container={buttonContainer}>
    <p>Create</p>
  </Button>
{/snippet}

{#snippet newFileTab()}
  <p>
    Uploaded files will be put inside the current folder. <ResponsiveLayout>
      {#snippet desktop()}
        Alternatively, files can be dragged and dropped into the folder area.
      {/snippet}
    </ResponsiveLayout>
  </p>

  {#if $selectedFiles.length > 0}
    <div class="selected-files" class:desktop={$viewMode & ViewMode.Desktop}>
      <table>
        <tbody>
          {#each $selectedFiles as selectedFile}
            <tr>
              <td class="file-name">{selectedFile.name}</td>
              <td class="file-size">{byteUnit(selectedFile.size)}</td>
            </tr>
          {/each}

          {#if $selectedFiles.length > 1}
            <tr>
              <th class="head">Total</th>
              <td class="file-size">
                <b>
                  {byteUnit($selectedFiles.reduce((total, current) => total + current.size, 0))}
                </b>
              </td>
            </tr>
          {/if}
        </tbody>
      </table>
    </div>
  {/if}
{/snippet}

{#snippet newFileTabActions()}
  <input
    type="file"
    hidden
    multiple
    bind:this={$fileInputElement}
    onchange={({ currentTarget: { files } }) => {
      $selectedFiles = Array.from(files ?? []);
    }}
  />

  <Button
    buttonClass={ButtonClass.Transparent}
    onClick={() => $fileInputElement?.click()}
    container={buttonContainer}
  >
    <p>Select Files</p>
  </Button>
  <Button onClick={() => onCreateFile(Array.from($selectedFiles))} container={buttonContainer}>
    <p>Upload</p>
  </Button>
{/snippet}

{#snippet dialogBody()}
  <Tab id={tabId} />
{/snippet}

{#snippet dialogActions()}
  <Tab id={tabId}>
    {#snippet host(tabs, currentIndex)}
      {@const tab = tabs[currentIndex]}

      {@render tab.actionView()}
    {/snippet}

    {#snippet view()}{/snippet}
  </Tab>
{/snippet}

{#snippet tabHost()}
  <Tab id={tabId}>
    {#snippet host(tabs, currentIndex, set: SetTabFunction)}
      <div class="tabs">
        {#each tabs as tab, tabIndex}
          {@const switchToTab = () => set(tabIndex)}

          <button class="tab-entry" class:active={tabs[currentIndex] === tab} onclick={switchToTab}>
            <p>
              {tab.name}
            </p>
          </button>
        {/each}
      </div>
    {/snippet}

    {#snippet view()}{/snippet}
  </Tab>
{/snippet}

<ResponsiveLayout>
  {#snippet mobile()}
    <Dialog {onDismiss} dialogClass={DialogClass.Normal}>
      {#snippet head()}
        <div class="mobile-head">
          {@render tabHost()}
        </div>
      {/snippet}

      {#snippet body()}
        {@render dialogBody()}
      {/snippet}

      {#snippet actions()}
        {@render dialogActions()}
      {/snippet}
    </Dialog>
  {/snippet}

  {#snippet desktop()}
    {@const {
      anchor: { offsetLeft, offsetTop, offsetHeight }
    } = props}

    <Overlay
      {onDismiss}
      position={[OverlayPositionType.Offset, offsetLeft, offsetTop + offsetHeight]}
    >
      <div class="overlay-layout" transition:fly|global={{ duration: 200, y: -16 }}>
        {@render tabHost()}
        {@render dialogBody()}
        {@render dialogActions()}
      </div>
    </Overlay>
  {/snippet}
</ResponsiveLayout>

<style lang="scss">
  div.mobile-head {
    display: flex;

    gap: 8px;
  }

  div.overlay-layout {
    display: flex;
    flex-direction: column;

    gap: 8px;
    padding: 16px;

    border-radius: 8px;

    background-color: var(--backgroundVariant);
    box-shadow: 2px 2px 8px var(--shadow);

    min-width: 320px;
    max-width: 320px;
  }

  div.tabs {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    gap: 4px;

    > button.tab-entry {
      flex-grow: 1;
      flex-basis: 0px;

      background-color: unset;
      color: inherit;

      border: none;
      border-radius: 8px;

      > p {
        padding: 8px;

        border: solid 1px transparent;
      }
    }

    > button:hover {
      cursor: pointer;

      background-color: var(--background);
      color: var(--onBackground);
    }

    > button:active {
      background-color: var(--primary);
      color: var(--onPrimary);
    }

    > button.tab-entry.active {
      > p {
        border-bottom-color: var(--primary);
      }
    }
  }

  div.button-container {
    padding: 8px;
  }

  div.selected-files.desktop {
    max-height: calc(100vh - 512px);
  }

  div.selected-files {
    display: flex;

    flex-direction: column;

    overflow: hidden auto;

    min-height: 32px;

    > table {
      min-width: 0px;

      box-sizing: border-box;

      td,
      th {
        padding: 4px 0px;
      }

      > thead,
      > tbody {
        th.head {
          text-align: start;
        }
      }

      > tbody {
        td.file-size {
          text-align: end;
        }

        td.file-name {
          text-align: start;

          font-style: italic;

          max-width: 128px;

          text-overflow: ellipsis;
          text-wrap: nowrap;
          overflow: hidden;
          max-lines: 1;
        }
      }
    }
  }
</style>
