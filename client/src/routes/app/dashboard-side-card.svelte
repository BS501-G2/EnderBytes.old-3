<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import {
    DashboardContextName,
    type DashboardContext,
    type DashboardContextMenuEntry
  } from './dashboard';
  import { getConnection2 } from '$lib/client/client';
  import User from '$lib/client/user.svelte';
  import { Button, ViewMode, viewMode } from '@rizzzi/svelte-commons';

  const { isWidthLimited, openSettings, openLogoutConfirm } =
    getContext<DashboardContext>(DashboardContextName);

  const { entries }: { entries: DashboardContextMenuEntry[] } = $props();

  const {
    serverFunctions: { whoAmI }
  } = getConnection2();

  type ActionCallback = (event: MouseEvent) => void;
</script>

{#snippet action(name: string, icon: string, onClick: ActionCallback, actionClass?: 'error')}
  <div class="action-button-outer">
    <Button {onClick} hint={name} buttonClass='transparent' outline={false}>
      <div class="action-button {actionClass}">
        <i class={icon}></i>
      </div>
    </Button>
  </div>
{/snippet}

{#snippet profileActions()}
  {@render action('Settings', 'fa-solid fa-gear', () => {
    $openSettings = true;
  })}

  {@render action(
    'Logout',
    'fa-solid fa-right-from-bracket',
    () => {
      $openLogoutConfirm = true;
    },
    'error'
  )}
{/snippet}

<div class="side-card" class:limited={$isWidthLimited}>
  <div class="buttons part" class:limited={$isWidthLimited}>
    {#each entries as entry}
      {@render action(entry.name, entry.icon, entry.onClick)}
    {/each}

    {#if $isWidthLimited}
      {@render profileActions()}
    {/if}
  </div>
  <div class="separator"></div>
  <div
    class="profile part"
    class:mobile={$viewMode & ViewMode.Mobile}
    class:desktop={$viewMode & ViewMode.Desktop}
    class:limited={$isWidthLimited}
  >
    {#await whoAmI() then user}
      {#if user != null}
        <div class="icon">
          <img src="/favicon.svg" alt="profile" />
        </div>
        {#if $viewMode & ViewMode.Desktop && !$isWidthLimited}
          <div class="name">
            <User {user} hyperlink={true} />
          </div>
          <div class="action">
            {@render profileActions()}
          </div>
        {/if}
      {/if}
    {/await}
  </div>
</div>

<style lang="scss">
  div.side-card {
    display: flex;
    flex-direction: column;

    padding: 0px 8px;
    border-radius: 8px;

    background-color: var(--primary);
    color: var(--onPrimary);
  }

  div.side-card.limited {
    padding: 8px 4px;
    gap: 8px;
  }

  div.buttons.part {
    display: flex;

    padding: 4px 0px;
  }

  div.action-button-outer {
    -webkit-app-region: no-drag;

    flex-grow: 1;

    display: flex;
    flex-direction: column;
  }

  div.buttons.part.limited {
    padding: unset;
    flex-direction: column;
  }

  div.part {
    flex-grow: 1;
  }

  div.profile.part {
    display: flex;

    max-height: 48px;
    min-height: 48px;

    align-items: center;

    gap: 4px;

    > div.icon {
      // aspect-ratio: 1;

      display: flex;
      flex-direction: row;

      align-items: center;
      justify-content: safe center;

      > img {
        min-width: 32px;
        max-width: 32px;
        min-height: 32px;
        max-height: 32px;
      }
    }

    > div.name {
      display: flex;

      flex-grow: 1;
    }

    > div.action {
      display: flex;
    }
  }

  div.profile.part.desktop {
    flex-direction: row;
  }

  div.profile.part.desktop.limited {
    flex-direction: column;
    max-height: unset;
    min-height: unset;

    > div.action {
      flex-direction: column;
    }
  }

  div.profile.part.mobile {
    flex-direction: column;
  }

  div.action-button {
    padding: 8px 4px;
  }

  div.action-button.error {
    color: var(--error);
  }

  div.separator {
    display: flex;

    min-height: 1px;
    max-height: 1px;

    background-color: var(--primaryContainer);
  }
</style>
