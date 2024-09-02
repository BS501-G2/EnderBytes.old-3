import { type ColorValues } from '@rizzzi/svelte-commons'
import { colors as base } from './ender'

export const colors = (): ColorValues => {
  const baseColors = base()

  return ({
    'primary': baseColors['primaryContainer'],
    'onPrimary': baseColors['onPrimaryContainer'],
    'primaryContainer': baseColors['primary'],
    'onPrimaryContainer': baseColors['onPrimary'],

    'primaryVariant': baseColors['primaryContainerVariant'],
    'onPrimaryVariant': baseColors['onPrimaryContainerVariant'],
    'primaryContainerVariant': baseColors['primaryVariant'],
    'onPrimaryContainerVariant': baseColors['onPrimaryVariant'],

    'background': baseColors['onBackground'],
    'backgroundVariant': baseColors['onBackgroundVariant'],
    'onBackground': baseColors['background'],
    'onBackgroundVariant': baseColors['backgroundVariant'],

    'error': baseColors['error'],
    'errorBackground': baseColors['errorBackground'],
    'onError': baseColors['onError'],

    'warning': baseColors['warning'],
    'warningBackground': baseColors['warningBackground'],
    'onWarning': baseColors['onWarning'],

    'info': baseColors['info'],
    'infoBackground': baseColors['infoBackground'],
    'onInfo': baseColors['onInfo'],

    'shadow': 0x0000007f
  })
}
