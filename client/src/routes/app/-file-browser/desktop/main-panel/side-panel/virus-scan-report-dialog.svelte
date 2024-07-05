<script lang="ts" context="module">
  import { Button, Dialog } from '@rizzzi/svelte-commons';
  import { type Snippet } from 'svelte';
  import { writable, type Writable } from 'svelte/store';

  const activeDialogs: Writable<string[][]> = writable([]);

  export function pushVirusDialog(viruses: string[]) {
    activeDialogs.update((activeDialogs) => {
      activeDialogs.push(viruses);
      return activeDialogs;
    });
  }
</script>

<script lang="ts">
  function shiftVirusDialog(viruses: string[]) {
    activeDialogs.update((value) => {
      value.splice($activeDialogs.indexOf(viruses), 1);
      return value;
    });
  }
</script>

{#each $activeDialogs as viruses}
  <Dialog onDismiss={() => shiftVirusDialog(viruses)}>
    {#snippet head()}
      <h2>Virus Scan Report</h2>
    {/snippet}
    {#snippet body()}
      {#if viruses.length === 0}
        <p>No viruses found when scanning this particular version of the file.</p>
      {:else}
        <p>The following viruses has been detected on this particular version of file:</p>
        <br />
        <ul class="virus-list">
          {#each viruses as virus, index}
            <li>{index + 1}. {virus}</li>
          {/each}
        </ul>
      {/if}
    {/snippet}

    {#snippet actions()}
      {#snippet buttonContainer(snippet: Snippet)}
        <div class="button-container">
          {@render snippet()}
        </div>
      {/snippet}

      <Button onClick={() => shiftVirusDialog(viruses)} container={buttonContainer}>OK</Button>
    {/snippet}
  </Dialog>
{/each}

<style lang="scss">
  ul.virus-list {
    list-style-type: circle;

    > li {
      list-style-type: circle;
    }
  }

  div.button-container {
    padding: 8px;
  }
</style>
