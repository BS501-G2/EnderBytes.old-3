<script lang="ts">
  import type { UserResource } from '@rizzzi/enderdrive-lib/shared';
  import { Button, Dialog } from '@rizzzi/svelte-commons';

  const {
    user,
    suspended,
    onConfirm,
    onDismiss
  }: { user: UserResource; suspended: boolean; onConfirm: () => void; onDismiss: () => void } =
    $props();

  type ActionCallback = () => void;
</script>

<Dialog {onDismiss}>
  {#snippet body()}
    <p>Are you sure you want to {suspended ? 'unsuspend' : 'suspend'} @{user.username}?</p>
  {/snippet}

  {#snippet actions()}
    {#snippet action(name: string, icon: string, onClick: ActionCallback)}
      <Button {onClick}>
        <div class="button">
          <i class={icon}></i>
          <p>{name}</p>
        </div>
      </Button>
    {/snippet}

    {@render action('Confirm', 'fa-solid fa-check', onConfirm)}
    {@render action('Cancel', 'fa-solid fa-xmark', onDismiss)}
  {/snippet}
</Dialog>

<style lang="scss">
  div.button {
    display: flex;
    align-items: center;

    padding: 8px;
    gap: 8px;
  }
</style>
