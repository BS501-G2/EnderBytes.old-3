<script lang="ts">
  import { getContext, onMount } from 'svelte';
  import {
    type FileViewContext,
    FileViewContextName,
    type FileViewData
  } from './file-manager-file-view.svelte';
  import { Button, ButtonClass, viewMode, ViewMode } from '@rizzzi/svelte-commons';
  import Icon from '$lib/ui/icon.svelte';

  const { file, mime }: FileViewData = $props();
  const mimeType = mime[0];

  const { setTopBarContent, setBottomBarContent } =
    getContext<FileViewContext>(FileViewContextName);

  onMount(() => setTopBarContent(topBar));
  onMount(() => setBottomBarContent(bottomBar));
</script>

{#snippet button(name: string, icon: string, action: () => void)}

{/snippet}

{#snippet topBar(data: FileViewData)}
  {#if $viewMode & ViewMode.Mobile}
    <Button buttonClass={ButtonClass.Transparent} outline={false} onClick={() => history.back()}>
      <Icon icon="chevron-left" thickness="solid" />
    </Button>
  {/if}

  <div class="file-name">
    {data.file.name}
  </div>

  <Button buttonClass={ButtonClass.Transparent} onClick={() => {}} outline={false}>
    <Icon icon="download" thickness="solid" />
  </Button>
{/snippet}

{#snippet bottomBar(data: FileViewData)}{/snippet}

<div class="file-content"></div>

<style lang="scss">
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

    overflow: hidden;
    text-overflow: ellipsis;
    text-wrap: nowrap;
  }
</style>
