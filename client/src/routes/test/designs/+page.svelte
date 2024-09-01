<script lang="ts">
  import { Button } from '@rizzzi/svelte-commons';

  function range(count: number): number[] {
    return [...Array(count).keys()];
  }
</script>

<div class="main">
  <h2>Feed: Shared File</h2>

  <div class="shared-files">
    <div class="header">
      <h2>Shared Files</h2>
      <Button onClick={() => {}}>
        <p>See More</p>
      </Button>
    </div>

    <div class="list">
      {#each range(50) as a}
        <div class="shared-file">
          <div class="icon">
            <img src="/favicon.svg" alt="Shared File" />
          </div>
          <div class="info">
            <p class="name"><b>File.png ({a})</b></p>
            <p class="shared-by">By @User</p>
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="scss">
  div.main {
    padding: 8px;

    background: var(--backgroundVariant);
    color: var(--onBackgroundVariant);
  }

  div.shared-files {
    display: flex;
    flex-direction: column;

    background-color: white;
    color: black;

    padding: 16px;
    border-radius: 16px;
    gap: 16px;

    > div.header {
      display: flex;
      flex-direction: row;

      > h2 {
        flex-grow: 1;
      }
    }
    > div.list {
      display: flex;
      flex-direction: row;

      gap: 8px;
      padding: 8px;

      overflow: auto hidden;
    }
  }

  div.shared-file {
    display: flex;
    flex-direction: row;

    min-width: 256px;
    max-width: 256px;

    border-radius: 8px;

    padding: 8px;
    gap: 8px;

    // background-color: var(--background);
    // color: var(--onBackground);

    border: solid 1px #7f7f7f4f;

    > div.icon {
      display: flex;
      flex-direction: column;

      justify-content: center;

      > img {
        min-width: 32px;
        max-width: 32px;
        min-height: 32px;
        max-height: 32px;
      }
    }

    > div.info {
      display: flex;
      flex-direction: column;

      > p.name {
        font-size: 1em;
      }

      > p.shared-by {
        font-size: 0.8rem;
        color: #7f7f7f7f;
      }
    }
  }
</style>
