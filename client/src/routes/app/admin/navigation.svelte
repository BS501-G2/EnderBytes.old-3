<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
</script>

{#snippet navigationEntry(name: string, icon: string, path: string)}
  <button
    class="navigation-entry"
    class:selected={$page.url.pathname === path}
    on:click={() => goto(path)}
  >
    <i class="fa-solid {icon}"></i>
    <p>{name}</p>
  </button>
{/snippet}

<div class="navigation-list">
  {@render navigationEntry('Manage Users', 'fa-solid fa-user', '/app/admin/users')}
  {@render navigationEntry('View File Access Logs', 'fa-solid fa-file-lines', '/app/admin/logs')}
</div>

<style lang="scss">
  div.navigation-list {
    display: flex;
    flex-direction: column;

    gap: 8px;
  }

  button.navigation-entry {
    display: flex;
    flex-direction: row;
    border: none;

    background-color: unset;
    color: inherit;

    padding: 8px;
    gap: 8px;
    border-radius: 8px;

    > i {
      font-size: 1.2em;
    }

    > p {
      flex-grow: 1;

      text-align: start;
    }
  }

  button.navigation-entry:hover {
    cursor: pointer;
  }

  button.navigation-entry.selected {
    background-color: var(--primaryContainer);
    color: var(--onPrimaryContainer);
  }
</style>
