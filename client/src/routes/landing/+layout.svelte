<script lang="ts">
  import { RootState } from '$lib/states/root-state';

  import NavigationBarDesktop from './IntroNavigationBarDesktop.svelte';
  import NavigationBarMobile from './IntroNavigationBarMobile.svelte';
  import Locale, { LocaleKey } from '$lib/locale.svelte';
  import { ResponsiveLayout, Title } from '@rizzzi/svelte-commons';
  import { type Snippet } from 'svelte';

  const { children }: { children: Snippet } = $props();
</script>

<ResponsiveLayout>
  {#snippet desktop()}
    <NavigationBarDesktop></NavigationBarDesktop>
  {/snippet}
  {#snippet mobile()}
    <NavigationBarMobile></NavigationBarMobile>
  {/snippet}
</ResponsiveLayout>

<svelte:head>
  <Locale string={[[LocaleKey.AppName], [LocaleKey.AppTagline]]}>
    {#snippet children([appName, appTagline])}
      <Title title={appTagline} last />
    {/snippet}
  </Locale>
</svelte:head>

<div style="display: contents; margin-top: {0}px; margin-bottom: {0}px;"></div>
{@render children()}
