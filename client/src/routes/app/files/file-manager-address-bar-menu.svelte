<script lang="ts">
  import { Overlay } from '@rizzzi/svelte-commons';
  import { getContext } from 'svelte';
  import { type FileManagerContext, FileManagerContextName } from './file-manager.svelte';

  const {} = getContext<FileManagerContext>(FileManagerContextName);
</script>

<Overlay>
  <p></p>
</Overlay>
