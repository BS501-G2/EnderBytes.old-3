<script lang="ts">
  import NavigationBarDesktop from './IntroNavigationBarDesktop.svelte';
  import NavigationBarMobile from './IntroNavigationBarMobile.svelte';
  import Locale  from '$lib/locale.svelte';
  import { Title, viewMode, ViewMode } from '@rizzzi/svelte-commons';
  import { type Snippet } from 'svelte';
	import { LocaleKey } from '$lib/locale';

  const { children }: { children: Snippet } = $props();
</script>

{#if $viewMode & ViewMode.Desktop}
  <NavigationBarDesktop></NavigationBarDesktop>
{:else if $viewMode & ViewMode.Mobile}
  <NavigationBarMobile></NavigationBarMobile>
{/if}

<svelte:head>
  <Locale string={[[LocaleKey.AppName], [LocaleKey.AppTagline]]}>
    {#snippet children([appName, appTagline])}
      <Title title={appTagline} last />
    {/snippet}
  </Locale>
</svelte:head>

<div style="display: contents; margin-top: {0}px; margin-bottom: {0}px;"></div>
{@render children()}
