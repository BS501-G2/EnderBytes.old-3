<script lang="ts" context="module">
</script>

<script lang="ts">
  import { ViewMode, viewMode } from '@rizzzi/svelte-commons';
  import { getContext } from 'svelte';
</script>

<div class="profile-panel">
  {#if $viewMode & ViewMode.Desktop}{/if}
</div>

<style lang="scss">
  div.profile-panel {
    min-height: 64px;
  }
</style>
