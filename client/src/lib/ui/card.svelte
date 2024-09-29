<script lang="ts">
  import type { Snippet } from 'svelte';

  const {
    paddingSize = 8,
    children,
    container,
    direction = 'column'
  }: {
    paddingSize?: number;
    children?: Snippet;
    container?: Snippet<[view: Snippet]>;
    direction?: 'row' | 'column';
  } = $props();
</script>

{#snippet defaultContainer(view: Snippet)}
  <div class="card-container" style="padding: {paddingSize}px; gap: {paddingSize}px; display: flex; flex-direction: {direction};">
    {@render view()}
  </div>
{/snippet}

<div class="card">
  {#snippet view()}
    {#if children}
      {@render children()}
    {/if}
  {/snippet}
  {#if container}
    {@render container(view as Snippet)}
  {:else}
    {@render defaultContainer(view as Snippet)}
  {/if}
</div>

<style lang="scss">
  div.card-container {
    background-color: var(--backgroundVariant);

    border-radius: 8px;
  }
</style>
