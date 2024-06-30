import { derived, type Readable, type Stores } from 'svelte/store';

export const readonly = <T>(store: Readable<T>): Readable<T> => derived(store, (value) => value);
