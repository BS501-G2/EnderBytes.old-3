<script lang="ts">
  import { ResponsiveLayout } from '@rizzzi/svelte-commons';
  import { type FileManagerContext, FileManagerContextName } from './file-manager.svelte';
  import FileManagerViewList from './file-manager-view-list.svelte';
  import FileManagerViewActions from './file-manager-view-actions.svelte';
  import FileManagerSidePanel from './file-manager-side-panel.svelte';
  import { getContext } from 'svelte';

  const { sidePanel } = getContext<FileManagerContext>(FileManagerContextName);
</script>

<ResponsiveLayout>
  {#snippet desktop()}
    <div class="sub">
      <div class="view desktop">
        <FileManagerViewActions />
        <div class="separator"></div>
        <FileManagerViewList />
      </div>

      {#if $sidePanel}
        <FileManagerSidePanel />
      {/if}
    </div>
  {/snippet}

  {#snippet mobile()}
    <div class="view mobile">
      <FileManagerViewList />

      <!-- {#if $selection.length} -->
      <div class="separator"></div>
      <FileManagerViewActions />
      <!-- {/if} -->
    </div>
  {/snippet}
</ResponsiveLayout>

<style lang="scss">
  div.separator {
    min-height: 1px;
    max-height: 1px;

    background-color: var(--primaryContainer);
  }

  div.view {
    display: flex;
    flex-direction: column;

    flex-grow: 1;
  }

  div.view.mobile {
  }

  div.view.desktop {
    min-height: 0px;

    border-radius: 8px;
    padding: 4px 8px;

    background-color: var(--backgroundVariant);
  }

  div.sub {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    gap: 8px;
  }
</style>
