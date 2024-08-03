<script lang="ts">
  import type { FileResource } from '@rizzzi/enderdrive-lib/server';
  import {
    Awaiter,
    Button,
    ButtonClass,
    Dialog,
    LoadingSpinner,
    ViewMode,
    viewMode
  } from '@rizzzi/svelte-commons';
  import { onMount, type Snippet } from 'svelte';

  const {
    embedded = false,
    file,
    onDismiss
  }: { embedded?: boolean; file: FileResource; onDismiss?: () => void } = $props();

  onMount(() => {
    return viewMode.subscribe((value) => {
      console.log(value);
      if (value & ViewMode.Desktop) {
        onDismiss?.();
      }
    });
  });

  interface Data {
    file: FileResource;
  }

  async function load(): Promise<Data> {
    await new Promise<void>((resolve) => setTimeout(resolve, 100));

    return { file };
  }

  let tab: number = $state(0);
</script>

{#if embedded}
  {@render layout()}
{:else}
  <Dialog onDismiss={() => onDismiss?.()}>
    {#snippet head()}
      <h2>{file.name}</h2>
    {/snippet}
    {#snippet body()}
      {@render layout()}
    {/snippet}
  </Dialog>
{/if}

{#snippet layout()}
  <div class="details">
    <div class="thumbnail-row">
      <div class="thumbnail">
        <img src="/favicon.svg" alt={file.name} />
      </div>
    </div>
    <div class="info-row">
      {#snippet tabButton(index: number, name: string)}
        {#snippet buttonContainer(view: Snippet)}
          <div class="button-container" class:selected={index == tab}>{@render view()}</div>
        {/snippet}

        <Button
          buttonClass={ButtonClass.Transparent}
          container={buttonContainer}
          outline={false}
          onClick={() => {
            tab = index;
          }}
        >
          <p class="tab-label">{name}</p>
        </Button>
      {/snippet}

      <Awaiter callback={() => load()}>
        {#snippet success({ result })}
          <div class="inner-view">
            <div class="tab-row">
              {@render tabButton(0, 'Overview')}
              {@render tabButton(1, 'Permissions')}
              {@render tabButton(2, 'Logs')}
            </div>

            <div class="page-view">
              {#if tab == 0}
                <table class="overview-table"></table>
              {:else if tab == 1}
              {:else if tab == 2}
              {/if}
            </div>
          </div>
        {/snippet}

        {#snippet loading()}
          <LoadingSpinner size="64px" />
        {/snippet}
      </Awaiter>
    </div>
  </div>
{/snippet}

<style lang="scss">
  div.details {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    gap: 8px;

    > div.thumbnail-row {
      padding: 32px;

      display: flex;
      flex-direction: column;
      align-items: center;

      > div.thumbnail {
        aspect-ratio: 1;
        max-height: 256px;

        > img {
          min-width: 100%;
          max-width: 100%;
          min-height: 100%;
          max-height: 100%;
        }
      }
    }

    > div.info-row {
      flex-grow: 1;

      display: flex;
      flex-direction: column;
      gap: 8px;

      justify-content: center;
      align-items: center;
    }
  }

  div.button-container {
    padding: 8px;

    border-bottom: solid 2px transparent;
  }

  div.button-container.selected {
    border-bottom-color: var(--primary);
  }

  p.tab-label {
    max-lines: 1;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  div.inner-view {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    min-width: 100%;
    max-width: 100%;
  }

  div.tab-row {
    display: flex;
    flex-direction: row;

    justify-content: center;
  }

  div.page-view {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
    gap: 8px;

    overflow: hidden auto;

    min-height: 0px;
  }
</style>
