<script lang="ts">
  import { Button, Dialog, DialogClass, ButtonClass } from '@rizzzi/svelte-commons';
  import { goto } from '$app/navigation';
  import { clearAuthentication } from '$lib/client/client';

  const { onDismiss }: { onDismiss: () => void } = $props();
</script>

<Dialog dialogClass={DialogClass.Normal} {onDismiss}>
  {#snippet actions()}
    <Button
      onClick={async () => {
        onDismiss();
        clearAuthentication();
        await goto('/login', { replaceState: true });
      }}
      buttonClass={ButtonClass.Primary}
    >
      <p class="label">OK</p>
    </Button>
    <Button onClick={onDismiss} buttonClass={ButtonClass.Background}>
      <p class="label">Cancel</p>
    </Button>
  {/snippet}
  {#snippet head()}
    <h2 style="margin: 0px;">Account Logout</h2>
  {/snippet}
  {#snippet body()}
    <span>This will log you out from the dashboard.</span>
  {/snippet}
</Dialog>

<style lang="scss">
  p.label {
    margin: 8px;
  }
</style>
