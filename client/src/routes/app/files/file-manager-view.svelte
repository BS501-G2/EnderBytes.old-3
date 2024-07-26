<script lang="ts" context="module">
</script>

<script lang="ts">
  import { getContext } from 'svelte';
  import {
    type FileManagerContext,
    FileManagerContextName,
    type FileManagerProps,
    FileManagerPropsName
  } from './file-manager.svelte';

  const {  } = getContext<FileManagerProps>(FileManagerPropsName);
  const { resolved } = getContext<FileManagerContext>(FileManagerContextName);
</script>

<style lang="scss">
</style>
