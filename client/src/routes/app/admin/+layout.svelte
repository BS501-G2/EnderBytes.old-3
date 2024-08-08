<script lang="ts" context="module">
  import { writable, type Writable } from 'svelte/store';

  export interface AdminContext {
    setMainContent: (layout: Snippet) => () => void;

    pushTopContent: (view: Snippet) => () => void;
  }

  export const AdminContextName = 'adm-context';
</script>

<script lang="ts">
  import { getContext, onMount, setContext, type Snippet } from 'svelte';
  import { DashboardContextName, type DashboardContext } from '../dashboard.svelte';
  import Navigation from './navigation.svelte';

  const { setMainContent } = getContext<DashboardContext>(DashboardContextName);
  const { children }: { children: Snippet } = $props();

  let topContent: Snippet[] = $state([]);
  let mainContent: Snippet | null = $state(null as never);

  setContext<AdminContext>(AdminContextName, {
    setMainContent: (view) => {
      mainContent = view;

      return () => {
        mainContent = null;
      };
    },

    pushTopContent: (view) => {
      topContent.push(view);
      topContent = topContent;

      return () => {
        const index = topContent.indexOf(view);
        if (index === -1) {
          return;
        }

        topContent.splice(index, 1);
        topContent = topContent;
      };
    }
  });

  onMount(() => setMainContent(layout));
</script>

{#snippet layout()}
  <div class="admin">
    <div class="side">
      <h2>Admin</h2>

      <Navigation />
    </div>

    <div class="main">
      <div class="top">
        {#each topContent as topContentEntry}
          {@render topContentEntry()}
        {/each}
      </div>

      <div class="bottom">
        {#if mainContent != null}
          {@render mainContent()}
        {/if}
      </div>
    </div>
  </div>
{/snippet}

{@render children()}

<style lang="scss">
  div.admin {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    overflow: auto hidden;

    padding: 16px;
    gap: 16px;
  }

  div.side {
    min-width: 256px;
    max-width: 256px;

    display: flex;
    flex-direction: column;

    gap: 8px;
  }

  div.main {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    background-color: var(--backgroundVariant);
    color: var(--onBackgroundVariant);

    border-radius: 16px;
    padding: 16px;

    gap: 16px;

    div.top {
      display: flex;
      flex-direction: row;

      // align-items: center;

      // min-height: 64px;
      // max-height: 64px;
    }

    div.bottom {
      display: flex;
      flex-direction: column;

      min-height: 0px;
    }
  }
</style>
