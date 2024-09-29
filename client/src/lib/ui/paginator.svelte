<script lang="ts" module>
  export interface PaginatorProps<T> {
    item: Snippet<[entry: T]>;
    container?: [
      element: HTMLDivElement,
      snippet: Snippet<[onScrollEnd: UIEventHandler<HTMLDivElement>, view: Snippet]>
    ];

    load: (offset: number, length: number) => Promise<T[]>;
    offset?: number;
    length?: number;
  }
</script>

<script lang="ts" generics="T extends any">
  import { onMount, type Snippet } from 'svelte';
  import type { UIEventHandler } from 'svelte/elements';

  const { load, container, item: entry, offset = 0, length = 10 }: PaginatorProps<T> = $props();

  let array: T[] = $state([]);
  let final: boolean = $state(false);

  let listElement: HTMLDivElement = $state(null as never);
  let listScroll: number = $state(0);

  let promise: Promise<void> | null = $state(null);

  function updateScroll() {
    const { scrollTop, scrollHeight, offsetHeight } = listElement ?? {};

    listScroll = (scrollHeight ?? 0) - (offsetHeight ?? 0) * 2 - (scrollTop ?? 0);
  }

  $effect(() => {
    if (listScroll <= 0 && !final) {
      promise ??= (async () => {
        try {
          const newEntries = await load(array.length + offset, length);
          if (newEntries.length === 0) {
            final = true;
          }

          array.push(...newEntries);
          array = array;
        } finally {
          promise = null;
        }
      })();

      updateScroll();
    }
  });

  if (container != null) {
    onMount(() => {
      listElement = container[0];

      return () => {
        listElement = null as never;
      };
    });
  }
</script>

{#snippet view()}
  {#each array as item}
    {@render entry(item)}
  {/each}
{/snippet}

{#if container != null}
  {@render container[1](updateScroll, view as Snippet)}
{:else}
  <div class="paginator" bind:this={listElement} onscroll={updateScroll}>
    {@render view()}
  </div>
{/if}

<style lang="scss">
  div.paginator {
    display: flex;
    flex-direction: column;

    min-height: 0px;

    overflow: auto;
  }
</style>
