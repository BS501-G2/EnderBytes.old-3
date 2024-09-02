
export enum LocaleType {
	en_US = 'en_US',
	tl_PH = 'tl_PH'
}

export type LocaleValues = Record<LocaleKey, (...args: unknown[]) => string>;
export enum LocaleKey {
	LanguageName,

	AppName,
	AppTagline,

	AltIconSite,
	AltIconSearch,

	SearchBarPlaceholder,
	SearchBannerPlaceholderText,
	AuthLoginPageUsernamePlaceholder,
	AuthLoginPagePasswordPlaceholder,
	AuthLoginPageSubmit
}
