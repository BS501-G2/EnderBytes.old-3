<script>
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
</script>

<div
  class="landing"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  TODO: Landing Page
</div>

<style lang="scss">
  div.landing.desktop {
    padding-top: 72px;
  }

  div.landing.mobile {
    padding-bottom: 64px;
  }
</style>
