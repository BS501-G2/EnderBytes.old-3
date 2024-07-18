<script lang="ts">
  import { ResponsiveLayout } from '@rizzzi/svelte-commons';
  import type { FileManagerProps } from './file-manager.svelte';

  const { ...props }: FileManagerProps = $props();
</script>

<ResponsiveLayout>
  {#snippet desktop()}{/snippet}

  {#snippet mobile()}{/snippet}
</ResponsiveLayout>
