import type { Snippet } from 'svelte';

export const AdminContextName = 'adm-context';

export interface AdminContext {
	setMainContent: (layout: Snippet) => () => void;

	pushTopContent: (view: Snippet) => () => void;

	pushToolboxContext: (view: Snippet) => () => void;
}
