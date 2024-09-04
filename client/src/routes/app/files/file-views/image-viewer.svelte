<script lang="ts">
	import { Buffer } from 'buffer';
	import { getConnection } from '$lib/client/client';
	import { fileBufferSize } from '@rizzzi/enderdrive-lib/shared';
	import type { FileViewData } from '../file-manager-file-view.svelte';
	import { onMount } from 'svelte';
	import { LoadingSpinner } from '@rizzzi/svelte-commons';
	import ErrorCard from './error-card.svelte';

	const { file }: FileViewData = $props();
	const {
		serverFunctions: { openFile, getFileHandleSize, readFile }
	} = getConnection();

	function concat(...buffers: Uint8Array[]): Uint8Array {
		const concat = new Uint8Array(buffers.reduce((total, buffer) => total + buffer.length, 0));
		let written: number = 0;
		while (buffers.length > 0) {
			const shiftedBuffer = buffers.shift()!;
			concat.set(shiftedBuffer, written);
			written += shiftedBuffer.length;
		}
		return concat;
	}

	let containerWidth: number = $state(0);
	let containerHeight: number = $state(0);
	let containerElement: HTMLDivElement = $state(null as never);

	let scale: number = $state(1);

	let contentWidth: number = $derived(containerWidth * scale);
	let contentHeight: number = $derived(containerHeight * scale);

	let contentX: number = $state(0);
	let contentY: number = $state(0);

	function scaleToFit() {
		scale = 1;
	}

	async function getFileData(): Promise<Uint8Array> {
		const buffer: Uint8Array[] = [];

		const fileHandleId = await openFile(file.id);
		const fileSize = await getFileHandleSize(fileHandleId);
		for (let position = 0; position < fileSize; position += fileBufferSize) {
			buffer.push(await readFile(fileHandleId, position, fileBufferSize));
		}

		return concat(...buffer);
	}

	let drag: boolean = $state(false);
	let dataState:
		| [status: 'loading']
		| [status: 'failed', error: Error]
		| [status: 'success', data: Uint8Array] = $state(['loading']);

	onMount(async () => {
		try {
			const data = await getFileData();
			dataState = ['success', data];
		} catch (error) {
			dataState = ['failed', error as Error];

			throw error;
		}
	});

	onMount(() => {
		containerElement.onwheel = (event) => {
			scale = Math.min(Math.max(scale - event.deltaY * 0.001, 1), 5);
		};

		containerElement.onmousedown = (event) => {
			drag = true;
		};

		containerElement.onmouseup = () => {
			drag = false;
		};

		containerElement.onmousemove = (event) => {
			if (drag) {
				contentX += event.movementX;
				contentY += event.movementY;
			}
		};
	});
</script>

<div class="file-content" bind:clientWidth={containerWidth} bind:clientHeight={containerHeight}>
	<div
		bind:this={containerElement}
		class="content-inner"
		style:min-width="{contentWidth}px"
		style:min-height="{contentHeight}px"
		style:max-width="{contentWidth}px"
		style:max-height="{contentHeight}px"
		style:transform="translate({contentX}px, {contentY}px)"
	>
		{#if dataState[0] === 'loading'}
			<div class="loading">
				<LoadingSpinner size="1.2em" />
				<p>Loading...</p>
			</div>
		{:else if dataState[0] === 'failed'}
			<ErrorCard title="Failed to load file" message={dataState[1].message} />
		{:else if dataState[0] === 'success'}
			<img
				src="data:image/png;base64,{Buffer.from(dataState[1]).toString('base64')}"
				alt="File"
				style:transform="scale({scale})"
			/>
		{/if}
	</div>
</div>

<style lang="scss">
	div.file-content {
		flex-grow: 1;

		display: flex;
		flex-direction: column;

		min-height: 0px;
		min-width: 0px;

		flex-basis: 0;
	}

	div.loading {
		flex-grow: 1;

		display: flex;

		align-items: center;
		justify-content: center;

		gap: 8px;
	}
</style>
