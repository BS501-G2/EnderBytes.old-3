<script lang="ts" context="module">
  import { onMount, type Snippet } from 'svelte';
  import { derived, readonly, writable } from 'svelte/store';

  const isOnline = writable(navigator.onLine);

  onMount(() => {
    const onOnline = () => {
      isOnline.set(true);
    };
    const onOffline = () => {
      isOnline.set(false);
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  });

  const readonlyIsOnline = readonly(isOnline);
  export { readonlyIsOnline as isOnline };
</script>

<script lang="ts">
  const { ...props }: { children: Snippet } | { online?: Snippet; offline?: Snippet } = $props();
</script>

{#if 'children' in props && props.children != null}
  {@render props.children()}
{:else}
  {#if 'online' in props && props.online != null}
    {@render props.online()}
  {/if}

  {#if 'offline' in props && props.offline != null}
    {@render props.offline()}
  {/if}
{/if}
