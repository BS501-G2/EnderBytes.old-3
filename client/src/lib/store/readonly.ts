import { derived, type Readable } from 'svelte/store';

export const readonly = <T>(store: Readable<T>): Readable<T> => derived(store, (value) => value);
