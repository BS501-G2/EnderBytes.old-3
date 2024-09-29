<script lang="ts" module>
	export const STATE_CONNECTING = 1;
	export const STATE_CONNECTED = 2;
	export const STATE_DISCONNECTED = 3;

	export interface ClientContext {
		state: Readable<number>;
		request: (name: string, args: any[]) => Promise<any>;
	}

	export const ClientContextName = 'ClientContext';

	export type ClientResponseMessage = { requestId: number; error: boolean; data: any };
	export type ClientRequestMessage = { requestId: number; requestName: string; requestArgs: any };
</script>

<script lang="ts">
	import { onMount, setContext, type Snippet } from 'svelte';

	import { derived, writable, type Readable, type Writable } from 'svelte/store';

	const state: Writable<number> = writable(STATE_DISCONNECTED);
	const currentTry: Writable<number> = writable(0);
	const request: Writable<((name: string, args: any[]) => Promise<any>) | null> = writable(null);

	const {} = setContext<ClientContext>(ClientContextName, {
		state: derived(state, (value) => value),
		request: async (name: string, args: any[]) => {
			if ($request == null) {
				throw new Error('Not connected');
			}

			await $request!(name, args);
		}
	});

	const { children }: { children: Snippet } = $props();

	function load(retry: number = 0): () => void {
		$state = STATE_CONNECTING;
		$currentTry = retry;

		let opened = false;

		const webSocket = new WebSocket('/ws');

		const pending: {
			[key: number]: {
				resolve: (data: any) => void;
				reject: (reason: any) => void;
			};
		} = {};

		$request = (name, args) =>
			new Promise<any>((resolve, reject) => {
				const requestId = Math.floor(Math.random() * 4294967296);
				const json = JSON.stringify({
					RequestId: requestId,
					RequestName: name,
					RequestArgs: args
				});

				pending[requestId] = { resolve, reject };
				webSocket.send(json);

				console.log(`-> ${json}`);
			});

		webSocket.onmessage = (message: MessageEvent) => {
			let response: ClientResponseMessage;

			try {
				const json = Buffer.from(message.data).toString('utf-8');

				console.log(`<- ${json}`);

				response = JSON.parse(json);
			} catch (error: any) {
				console.error(error);
				return;
			}

			const { requestId: id, error: isError, data: responseData } = response;

			const entry = pending[id];
			if (entry == null) {
				return;
			}

			delete pending[id];
			if (isError) {
				entry.reject(new Error(responseData.message));
			} else {
				entry.resolve(responseData);
			}
		};

		webSocket.onclose = () => {
			$request = null;

			for (const responseId in pending) {
				const entry = pending[responseId];

				entry.reject(new Error('WebSocket connection closed.'));
			}

			setTimeout(() => load(), 1000);
		};

		webSocket.onopen = () => {
			opened = true;
		};

		webSocket.onerror = (error) => {
			$request = null;

			console.error(error);

			if (!opened) {
				setTimeout(() => load(), 1000);
			}
		};

		return () => webSocket.close();
	}

	onMount(() => load());
</script>

{@render children()}

<style lang="scss">
</style>
