<script>
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
</script>

<div
  class="landing"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class=first>
    <h1>Seamless and Secure Access to Your Data</h1>
    <p> </p>
  </div>
</div>

<style lang="scss">
  div.landing{
     overflow-y: auto;
  }
  div.first{
    display:flex;
    justify-content: center;
    align-items:center;
    text-align: center;
    height:75vh;
    font-size: 1.5em;
  }
  div.landing.desktop {
    padding-top: 72px;

  }

  div.landing.mobile {
    padding-bottom: 64px;
  }
</style>
