<script lang="ts">
  import { getContext, onMount, type Snippet } from 'svelte';
  import {
    type FileViewContext,
    FileViewContextName,
    type FileViewData
  } from './file-manager-file-view.svelte';
  import {
    Button,
    ButtonClass,
    Overlay,
    OverlayPositionType,
    viewMode,
    ViewMode
  } from '@rizzzi/svelte-commons';
  import Icon, { type IconProps } from '$lib/ui/icon.svelte';
  import { scale } from 'svelte/transition';

  const { file, mime }: FileViewData = $props();
  const [type, subtype] = mime[0].split(';')[0].split('/') as [string, string];

  const { setTopBarContent, setBottomBarContent, showMobileActions } =
    getContext<FileViewContext>(FileViewContextName);

  onMount(() => setTopBarContent(topBar));
  onMount(() => setBottomBarContent(bottomBar));

  type Action = (event: MouseEvent) => void;
</script>

{#snippet button(hint: string, icon: IconProps, onClick: Action, showLabel: boolean)}
  {#snippet container(view: Snippet)}
    <div class="button-container" class:mobile={$viewMode & ViewMode.Mobile}>
      {@render view()}
    </div>
  {/snippet}
  <Button buttonClass={ButtonClass.Transparent} outline={false} {onClick} {hint} {container}>
    <div class="button">
      <Icon {...icon} />

      {#if showLabel}
        <p>{hint}</p>
      {/if}
    </div>
  </Button>
{/snippet}

{#snippet topBar(data: FileViewData)}
  {#if $viewMode & ViewMode.Mobile}
    {@render button(
      'Back',
      { icon: 'chevron-left', thickness: 'solid' },
      () => history.back(),
      !!($viewMode & ViewMode.Desktop)
    )}
  {/if}

  <div class="file-name">
    <p>
      {data.file.name}
    </p>
  </div>

  {#if $viewMode & ViewMode.Desktop}
    {@render topRightActions()}
  {:else if $viewMode & ViewMode.Mobile}
    {@render button(
      'More',
      { icon: 'ellipsis-vertical', thickness: 'solid' },
      ({ currentTarget }) => {
        $showMobileActions = [currentTarget as HTMLElement];
      },
      false
    )}

    {#if $showMobileActions != null}
      {@const [element] = $showMobileActions}
      <Overlay
        onDismiss={() => {
          $showMobileActions = null;
        }}
        position={[
          OverlayPositionType.Offset,
          -(window.innerWidth - (element.offsetLeft + element.offsetWidth)),
          element.offsetTop + element.offsetHeight
        ]}
      >
        <div class="mobile-top-actions" transition:scale|global={{ duration: 250, start: 0.95 }}>
          {@render topRightActions()}
        </div>
      </Overlay>
    {/if}
  {/if}
{/snippet}

{#snippet bottomBar(data: FileViewData)}
  {#if $viewMode & ViewMode.Desktop}
    {@render bottomActions(button)}
  {:else if $viewMode & ViewMode.Mobile}
    <div class="mobile-bottom-actions">
      {#snippet button(hint: string, icon: IconProps, onClick: Action, showLabel: boolean)}
        <button class="mobile-bottom-action" onclick={onClick}>
          <Icon {...icon} size="1.2rem" />

          {#if showLabel}
            <p>{hint}</p>
          {/if}
        </button>
      {/snippet}

      {@render bottomActions(button)}
    </div>
  {/if}
{/snippet}

{#snippet topRightActions()}
  {@render button('Download', { icon: 'download', thickness: 'solid' }, () => {}, true)}
{/snippet}

{#snippet bottomActions(
  button: Snippet<
    [
      hint: string,
      icon: IconProps,
      onClick: Action,
      showLabel: boolean,
      container?: Snippet<[view: Snippet]>
    ]
  >
)}
  {@render button('Download', { icon: 'download', thickness: 'solid' }, () => {}, true)}
{/snippet}

<div class="file-content"></div>

<style lang="scss">
  div.button-container.mobile {
    padding: 8px;
  }

  div.button {
    display: flex;
    flex-direction: row;

    gap: 8px;
    align-items: center;

    line-height: 1em;
  }

  div.file-content {
    flex-grow: 1;
    display: flex;
  }

  div.file-name {
    flex-grow: 1;
    font-size: 0.9rem;

    display: flex;
    flex-direction: row;
    align-items: center;

    min-width: 0px;

    font-weight: bolder;

    > p {
      overflow: hidden;
      text-overflow: ellipsis;
      text-wrap: nowrap;
    }
  }

  div.mobile-top-actions {
    display: flex;
    flex-direction: column;

    gap: 8px;
    padding: 8px;

    background-color: #0f0f0f;
    color: white;
  }

  div.mobile-bottom-actions {
    flex-grow: 1;

    display: flex;
    flex-direction: row;
  }

  button.mobile-bottom-action {
    flex-grow: 1;

    display: flex;
    flex-direction: column;

    justify-content: center;
    align-items: center;

    line-height: 1em;

    gap: 4px;

    background-color: transparent;
    color: inherit;

    border: none;

    > p {
      font-size: 0.75rem;
    }
  }

  button.mobile-bottom-action:active {
    background-color: white;
    color: black;
  }
</style>
