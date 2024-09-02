<script lang="ts" module>
	import { type Snippet } from 'svelte';
	import { LocaleKey, LocaleType, type LocaleValues } from './locale';
	import { locale as en_US } from './locale/en-us';
	import { locale as tl_PH } from './locale/tl-ph';
	import { derived, get, type Writable } from 'svelte/store';
	import { persisted } from 'svelte-persisted-store';

	export const strings: Record<LocaleType, LocaleValues> = {
		[LocaleType.en_US]: en_US(),
		[LocaleType.tl_PH]: tl_PH()
	};

	const currentLocale: Writable<LocaleType | null> = persisted('locale', null);

	export function getLocale() {
		const locale: LocaleType | null = get(currentLocale);

		if (locale == null || !(locale in LocaleType)) {
			const defaultLocale = LocaleType.en_US;

			return defaultLocale;
		}

		return locale;
	}

	export function setLocale(newLocale: LocaleType) {
		currentLocale.set(newLocale);
	}

	export function getString(
		key: LocaleKey,
		locale?: LocaleType | null,
		...args: unknown[]
	): string {
		if (locale == null) {
			locale = getLocale();
		}

		return strings?.[locale]?.[key]?.(...args) ?? `\${${locale},${key}}`;
	}

	export function getDerivedString(key: LocaleKey, ...args: any[]) {
		return derived(currentLocale, (locale) => getString(key, locale, ...args));
	}
</script>

<script lang="ts">
	let {
		locale = null,
		string,
		children
	}: {
		locale?: LocaleType | null;
		string: [LocaleKey, ...string[]][];
		children?: Snippet<[string[]]>;
	} = $props();
</script>

{#if locale == null && $currentLocale != null}
	<svelte:self {children} {string} locale={$currentLocale} />
{:else if !children}
	{#snippet content(string: string[])}
		<p>{string}</p>
	{/snippet}

	<svelte:self children={content} {string} {locale} />
{:else}
	{@render children(string.map(([key, ...args]) => getString(key, locale, ...args)))}
{/if}
