<script lang="ts">
  const {
    orientation,
    'with-margin': withMargin
  }: { orientation: 'horizontal' | 'vertical'; 'with-margin'?: boolean } = $props();
</script>

<div class="{orientation} separator" class:with-margin={withMargin}></div>

<style lang="scss">
  div.separator {
    background-color: var(--primaryContainer);
  }

  div.separator.horizontal {
    min-height: 1px;
    max-height: 1px;
  }

  div.separator.horizontal.with-margin {
    margin: 0px 8px;
  }

  div.separator.vertical {
    min-width: 1px;
    max-width: 1px;
  }

  div.separator.vertical.with-margin {
    margin: 8px 0px;
  }
</style>
