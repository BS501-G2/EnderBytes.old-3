import { LocaleKey, type LocaleValues } from '$lib/locale';
import { locale as en_US } from './en-us';

export const locale: () => LocaleValues = () => ({
	...en_US(),

	[LocaleKey.AppName]: () => 'EnderDrives',
	[LocaleKey.LanguageName]: () => 'Tagalog'
});
