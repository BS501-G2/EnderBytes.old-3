<script>
  import { viewMode, ViewMode } from '@rizzzi/svelte-commons';
</script>

<div
  class="landing"
  class:desktop={$viewMode & ViewMode.Desktop}
  class:mobile={$viewMode & ViewMode.Mobile}
>
  <div class=firstGrid-Container>
    <div class="gridInfo">
      <h1>Secure and Private File Storage and Sharing Website <br> for Melchora Aquino Elementary School.</h1>
    </div>
    <div class="gridImage">
      <img src="first (1).png" alt="first">
    </div>

  </div>
</div>

<style lang="scss">
  div.landing{
     overflow-y: auto;
  }
  div.firstGrid-Container{
    display:grid;
    grid-template-columns: auto auto;
    background-color: #FFFF;
  }
  div.landing.desktop {
    padding-top: 72px;

  }

  div.landing.mobile {
    padding-bottom: 64px;
  }
</style>
