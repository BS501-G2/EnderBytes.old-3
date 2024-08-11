<script lang="ts" context="module">
</script>

<script lang="ts">
  import {
    AnimationFrame,
    Button,
    ButtonClass,
    LoadingSpinner,
    ViewMode,
    viewMode,
    LoadingBar
  } from '@rizzzi/svelte-commons';
  import { getContext, type Snippet } from 'svelte';
  import { DashboardContextName, type DashboardContext } from './dashboard.svelte';
  import { backgroundTasks, BackgroundTaskStatus } from '$lib/background-task.svelte';
  import { derived } from 'svelte/store';

  const {}: {} = $props();

  let root: HTMLDivElement = $state(null as never);

  const { isWidthLimited } = getContext<DashboardContext>(DashboardContextName);

  const runningTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Running)
  );

  const finishedTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Done)
  );

  const failedTasks = derived(backgroundTasks, (backgroundTasks) =>
    backgroundTasks.filter((task) => task.status === BackgroundTaskStatus.Failed)
  );
</script>

{#snippet icon()}
  <Button onClick={() => {}} buttonClass={ButtonClass.Transparent} outline={false}>
    <div class="operation-button">
      <div class="icon">
        {#if $runningTasks.length > 0}
          <i class="icon fa-solid fa-circle-notch fa-spin"></i>
        {:else if $finishedTasks.length > 0}
          <i class="icon fa-solid fa-check"></i>
        {:else if $failedTasks.length > 0}
          <i class="icon fa-solid fa-xmark"></i>
        {/if}
      </div>
      {#if !$isWidthLimited}
        <div class="message-column">
          <div class="main row">
            <div class="left column">
              {#if $runningTasks.length > 0}
                {#if $runningTasks.length === 1}
                  <p>{$runningTasks[0].message}</p>
                {:else}
                  <p>{$runningTasks.length} running tasks</p>
                {/if}
              {:else}
                <p>All tasks finished</p>
              {/if}
            </div>

            <div class="right column"></div>
          </div>

          <div class="sub row">
            <div class="left column">
              <div class="loading-bar">
                {#if $runningTasks.length > 0}
                  <LoadingBar
                    progress={$runningTasks.reduce((a, b) => a + (b.progress ?? 0), 0) /
                      $runningTasks.length}
                  />
                {/if}
              </div>
            </div>

            <div class="right column">
              {#if $runningTasks.length > 0}
                <p>
                  {Math.round(
                    ($runningTasks.reduce((a, b) => a + (b.progress ?? 0), 0) /
                      $runningTasks.length) *
                      100
                  )}%
                </p>
              {/if}
            </div>
          </div>
        </div>
      {/if}
    </div>
  </Button>
{/snippet}

<div
  class="operations"
  class:mobile={$viewMode & ViewMode.Mobile}
  class:desktop={$viewMode & ViewMode.Desktop}
  class:limited={$isWidthLimited}
  bind:this={root}
>
  {@render icon()}
</div>

<style lang="scss">
  div.operations {
    display: flex;
    flex-direction: column;

    min-height: 64px;
    max-height: 64px;

    justify-content: safe center;
  }

  div.operations.desktop {
    min-width: 256px;
    max-width: 256px;
  }

  div.operations.desktop.limited {
    min-width: 64px;
    max-width: 64px;
  }

  div.operation-button {
    flex-grow: 1;

    display: flex;
    flex-direction: row;

    align-items: center;

    padding: 8px 8px;
    gap: 8px;

    overflow-x: hidden;
    word-wrap: break-word;

    > div.icon {
      > i {
        font-size: 32px;
      }
    }

    > div.message-column {
      flex-grow: 1;

      display: flex;
      flex-direction: column;

      justify-content: space-between;

      gap: 4px;

      > div.row {
        display: flex;
        flex-direction: row;

        gap: 8px;

        justify-content: space-between;
      }

      > div.row.sub {
        > div.column.left {
          align-items: center;
        }
      }

      > div.row.sub {
        font-size: 0.8em;

        color: var(--shadow);
      }

      > div.row {
        > div.column {
          display: flex;
          flex-direction: row;
        }

        > div.column.left {
          flex-grow: 1;
        }
      }
    }
  }

  div.loading-bar {
    flex-grow: 1;

    display: flex;
    flex-direction: column;
  }
</style>
