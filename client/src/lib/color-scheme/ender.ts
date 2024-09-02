import { type ColorValues } from '@rizzzi/svelte-commons';

export const colors = (): ColorValues => ({
  'primary': 0x0f3031ff,
  'onPrimary': 0xffffffff,
  'primaryContainer': 0x86c24fff,
  'onPrimaryContainer': 0x0f3031ff,

  'primaryVariant': 0x0f3031d1,
  'onPrimaryVariant': 0xffffffff,
  'primaryContainerVariant': 0xb9dc9aff,
  'onPrimaryContainerVariant': 0x37812eff,

  'background': 0xebf4e4ff,
  'backgroundVariant': 0xffffffff,
  'onBackground': 0x1f4041ff,
  'onBackgroundVariant': 0x071718ff,

  'error': 0xcc3300ff,
  'errorBackground': 0xcc33007f,
  'onError': 0xffffffff,

  'warning': 0xffcc00ff,
  'warningBackground': 0xffcc007f,
  'onWarning': 0xffffffff,

  'info': 0x40a6ceff,
  'infoBackground': 0x40a6ce7f,
  'onInfo': 0xffffffff,

  'shadow': 0x0000007f
});
