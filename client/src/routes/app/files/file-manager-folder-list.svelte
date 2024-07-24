<script lang="ts">
  import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { scale } from 'svelte/transition';
</script>

<div
  class="list"
  class:mobile={$viewMode & ViewMode.Mobile}
  class:desktop={$viewMode & ViewMode.Desktop}
  in:scale={{ start: 0.9, duration: 250 }}
  out:scale={{ start: 0.9, duration: 250 }}
></div>

<style lang="scss">
  div.list {
    flex-grow: 1;
    min-height: 0px;
    display: flex;
  }
</style>
