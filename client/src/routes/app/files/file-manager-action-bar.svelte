<script lang="ts">
  import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { type FileManagerAction } from './file-manager.svelte';

  function getActions(): FileManagerAction[] {
    const actions: FileManagerAction[] = [];

    actions.push({
      name: 'test',
      icon: 'fa-solid fa-folder',
      action: async () => {}
    });

    return actions;
  }
</script>

<div
  class="action-bar"
  class:mobile={$viewMode & ViewMode.Mobile}
  class:desktop={$viewMode & ViewMode.Desktop}
>
  {#each getActions() as action}
    <button class="action-bar-button"></button>
  {/each}
</div>

<style lang="scss">
  div.action-bar {
    display: flex;
    flex-direction: row;

    min-height: calc(24px + 1em);
    // line-height: 1em;
  }

  div.action-bar.desktop {
    padding: 4px 8px;

    box-sizing: border-box;
  }

  button.action-bar-button {
    display: flex;
    flex-direction: row;

    align-items: center;

    gap: 8px;
  }
</style>
