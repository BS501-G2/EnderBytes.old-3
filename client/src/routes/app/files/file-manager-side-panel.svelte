<script lang="ts">
  import { ResponsiveLayout } from '@rizzzi/svelte-commons';
  import {
    type FileManagerContext,
    FileManagerContextName,
    type FileManagerProps
  } from './file-manager.svelte';
  import { getContext } from 'svelte';

  const {} = getContext<FileManagerContext>(FileManagerContextName);
</script>

<ResponsiveLayout>
  {#snippet desktop()}
    <div class="mobile side-panel"></div>
  {/snippet}

  {#snippet mobile()}
    <div class="desktop side-panel"></div>
  {/snippet}
</ResponsiveLayout>

<style lang="scss">
  div.side-panel {
  }

  div.side-panel.mobile {
  }

  div.side-panel.desktop {
  }
</style>
