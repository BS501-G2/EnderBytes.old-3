import type { Snippet } from 'svelte';
import type { Writable } from 'svelte/store';

export interface DashboardContextMenuEntry {
	name: string;
	icon: string;
	onClick: (event: MouseEvent) => void;
}

export interface DashboardContext {
	addContextMenuEntry: (
		name: string,
		icon: string,
		onClick: (event: MouseEvent) => void
	) => () => void;

	setMainContent: (children: Snippet | null) => () => void;

	pushOverlayContent: (children: Snippet) => () => void;

	openSettings: Writable<boolean>;
	openLogoutConfirm: Writable<boolean>;
	openExtraContextMenuOverlay: Writable<
		[element: HTMLElement, entries: DashboardContextMenuEntry[], onDismiss: () => void] | null
	>;

	isWidthLimited: Writable<boolean>;
}

export const DashboardContextName = 'dashboard-context';
