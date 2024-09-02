<script lang="ts" module>
	import { type FileManagerSelection, FileManagerViewMode } from './file-manager-folder-list';
</script>

<script lang="ts">
	import { AnimationFrame, hasKeys, Overlay, ViewMode, viewMode } from '@rizzzi/svelte-commons';
	import { getContext } from 'svelte';
	import { scale } from 'svelte/transition';
	import {
		type FileManagerContext,
		FileManagerContextName,
		type FileManagerProps,
		FileManagerPropsName
	} from './file-manager.svelte';
	import type { FileResource } from '@rizzzi/enderdrive-lib/server';
	import FileManagerSeparator from './file-manager-separator.svelte';
	import { writable, type Writable } from 'svelte/store';

	const { resolved, listViewMode } = getContext<FileManagerContext>(FileManagerContextName);

	const props = getContext<FileManagerProps>(FileManagerPropsName);

	const files: FileResource[] =
		$resolved.status === 'success' && !($resolved.page === 'files' && $resolved.type === 'file')
			? $resolved.files
			: [];

	const selected: Writable<FileResource[]> =
		$resolved.status === 'success' ? $resolved.selection : writable([]);

	const desktopSelection: Writable<FileManagerSelection | null> = writable(null);
	const desktopSelectionBoxCoordinates: Writable<
		[x: number, y: number, w: number, h: number] | null
	> = writable(null);

	let list: HTMLDivElement = $state(null as never);
	let innerList: HTMLDivElement = $state(null as never);
	let desktopSelectionBox: HTMLDivElement | null = $state(null);
	let desktopSelectionBoxContainer: HTMLDivElement | null = $state(null);
	let isWindowWIdthLimited: boolean = $state(isWindowWidthLimitedChecker());

	function isWindowWidthLimitedChecker(): boolean {
		return window.innerWidth < 416;
	}

	$effect(() => {
		console.log('isWindowWidthLimited', isWindowWIdthLimited);
	});

	function updateSelectionSnapshot(
		...args:
			| [
					type: 'down',
					x: number,
					y: number,
					boxX: number,
					boxY: number,
					boxW: number,
					boxH: number,
					boxS: number
			  ]
			| [
					type: 'update',
					x: number,
					y: number,
					boxX: number,
					boxY: number,
					boxW: number,
					boxH: number,
					boxS: number
			  ]
			| [type: 'update']
			| [type: 'up']
	) {
		if (!($viewMode & ViewMode.Desktop)) {
			return;
		}

		if (args[0] === 'down') {
			const [, x, y, boxX, boxY, boxW, boxH, boxS] = args;

			const type: FileManagerSelection['type'] = hasKeys('shift')
				? 'shift'
				: hasKeys('control')
					? 'ctrl'
					: 'normal';

			$desktopSelection = {
				saved: type === 'normal' ? [] : [...$selected],

				type,

				x,
				y,
				w: 0,
				h: 0,

				boxX,
				boxY,
				boxW,
				boxH,
				boxS
			};

			$desktopSelectionBoxCoordinates = calculateSelectionBoxCoordinates($desktopSelection);
		} else if (args[0] === 'update') {
			if ($desktopSelection == null) {
				return;
			}

			const [, x, y, boxX, boxY, boxW, boxH, boxS] = args;

			if (
				x != null &&
				y != null &&
				boxX != null &&
				boxY != null &&
				boxW != null &&
				boxH != null &&
				boxS != null
			) {
				$desktopSelection.w = x - $desktopSelection.x;
				$desktopSelection.h = y - $desktopSelection.y;

				$desktopSelection.boxX = boxX;
				$desktopSelection.boxY = boxY;
				$desktopSelection.boxW = boxW;
				$desktopSelection.boxH = boxH;
				$desktopSelection.boxS = boxS;
			} else {
				const topDistance = $desktopSelection.y + $desktopSelection.h - $desktopSelection.boxS;
				const bottomDistance = $desktopSelection.boxH - topDistance;

				let increment = 0;
				if (topDistance < 128) {
					increment -= (128 - topDistance) / 2;
				}

				if (bottomDistance < 128) {
					increment += (128 - bottomDistance) / 2;
				}

				if (increment !== 0) {
					const scrollBefore = list.scrollTop;
					list.scrollBy(0, increment);
					const scrollAfter = list.scrollTop;

					$desktopSelection.boxS = scrollAfter;
					$desktopSelection.h += scrollAfter - scrollBefore;
				}
			}
		} else if (args[0] === 'up') {
			if ($desktopSelection == null) {
				return;
			}

			$desktopSelection = null;
			$desktopSelectionBoxCoordinates = null;
		}
	}

	function calculateSelectionBoxCoordinates(
		selection: FileManagerSelection
	): [x: number, y: number, w: number, h: number] {
		if (selection.w >= 0 && selection.h >= 0) {
			return [selection.x, selection.y, selection.w, selection.h];
		}

		const startX = selection.x + (selection.w < 0 ? selection.w : 0);
		const startY = selection.y + (selection.h < 0 ? selection.h : 0);

		const width = Math.abs(selection.w);
		const height = Math.abs(selection.h);

		return [startX, startY, width, height];
	}

	function updateSelectedFiles(): void {
		if (desktopSelectionBox == null || $desktopSelection == null) {
			return;
		}

		function getRect(element: HTMLElement, selection: FileManagerSelection) {
			const { x, y, width, height } = element.getBoundingClientRect();

			return { x, y: y + selection.boxS, width, height: height };
		}

		const { x, y, width, height } = getRect(desktopSelectionBox, $desktopSelection);

		const newSelectedList: FileResource[] = [...$desktopSelection.saved];

		const fileElementCount: number = innerList.children.length;
		for (let index = 0; index < fileElementCount; index++) {
			const element: HTMLButtonElement = innerList.children[index] as HTMLButtonElement;

			const {
				x: elementX,
				y: elementY,
				width: elementWidth,
				height: elementHeight
			} = getRect(element, $desktopSelection);

			if (
				x < elementX + elementWidth &&
				x + width > elementX &&
				y < elementY + elementHeight &&
				y + height > elementY
			) {
				const file = files[index];

				if (file == null) {
					continue;
				}

				const foundIndex = newSelectedList.indexOf(file);

				if ($desktopSelection.type === 'ctrl') {
					if (foundIndex === -1) {
						newSelectedList.push(file);
					} else {
						newSelectedList.splice(foundIndex, 1);
					}
				} else if ($desktopSelection.type === 'shift') {
					if (foundIndex === -1) {
						newSelectedList.push(file);
					}
				} else {
					newSelectedList.push(file);
				}
			}
		}

		if (newSelectedList.map((file) => file.id).join() === $selected.map((file) => file.id).join()) {
			return;
		}
		$selected = newSelectedList;
	}

	const drag: Writable<[x: number, y: number] | null> = writable(null);

	function processDragEvent(
		event: DragEvent,
		target: HTMLElement,
		...args:
			| [event: 'enter']
			| [event: 'leave']
			| [event: 'over', x: number, y: number]
			| [event: 'drop', files: File[]]
	) {
		if (!(target != null && (target === list || list.contains(target as never)))) {
			return;
		}

		if (args[0] === 'enter') {
			$drag = null;
		} else if (args[0] === 'leave') {
			$drag = null;
		} else if (args[0] === 'over') {
			$drag = [args[1], args[2]];
		} else if (args[0] === 'drop') {
			$drag = null;
			if (props.page === 'files') {
				props.onNew(
					Object.defineProperty(event, 'currentTarget', {
						get: () => desktopSelectionBoxContainer!
					}),
					args[1]
				);
			}
		}
	}
</script>

{#snippet fileEntryView(index: number, file: FileResource)}
	<button
		class="file-entry"
		class:grid={$listViewMode === FileManagerViewMode.Grid}
		class:list={$listViewMode === FileManagerViewMode.List}
		class:selected={$selected.includes(file)}
		ondblclick={(event) => {
			props.onFileId(event, file.id);
		}}
		oncontextmenu={(event) => {
			event.preventDefault();
		}}
		onclick={(event) => {
			const eventA = event as unknown as PointerEvent;

			if (eventA.pointerType === 'touch') {
				props.onFileId(event, file.id);
				return;
			}

			if (hasKeys('control') || hasKeys('shift')) {
				const foundIndex = $selected.indexOf(file);

				if (foundIndex === -1) {
					$selected.push(file);
				} else {
					$selected.splice(foundIndex, 1);
				}

				$selected = $selected;
			} else {
				if ($selected.length === 1 && $selected[0] === file) {
					return;
				}

				$selected = [file];
			}
		}}
	>
		<div class="thumbnail grid">
			{#if file.type === 'folder'}
				<i class="fa-regular fa-folder"></i>
			{:else if file.type === 'file'}
				<img src="/favicon.svg" alt="Thumbnail" />
			{/if}
		</div>

		<FileManagerSeparator orientation="horizontal" with-margin />
		<div class="file-info grid">
			<i class="fa-regular fa-{file.type}"></i>
			<p>{file.name}</p>
		</div>
	</button>
{/snippet}

{#if $desktopSelection != null}
	<AnimationFrame
		callback={() => {
			updateSelectionSnapshot('update');

			$desktopSelectionBoxCoordinates = calculateSelectionBoxCoordinates($desktopSelection!);

			updateSelectedFiles();
		}}
	/>
{/if}

<svelte:window
	onmousedown={({ target, clientX, clientY }) => {
		if (target === innerList) {
			updateSelectionSnapshot(
				'down',
				clientX - list.offsetLeft,
				clientY - list.offsetTop + list.scrollTop,

				list.offsetLeft,
				list.offsetTop,
				list.offsetWidth,
				list.offsetHeight,
				list.scrollTop
			);
		}
	}}
	onmousemove={({ clientX, clientY }) => {
		updateSelectionSnapshot(
			'update',
			clientX - list.offsetLeft,
			clientY - list.offsetTop + list.scrollTop,

			list.offsetLeft,
			list.offsetTop,
			list.offsetWidth,
			list.offsetHeight,
			list.scrollTop
		);
	}}
	onmouseup={() => {
		updateSelectionSnapshot('up');
	}}
	ondragenter={(event) => {
		event.preventDefault();
		event.stopPropagation();
		processDragEvent(event, event.target as HTMLElement, 'enter');
	}}
	ondragleave={(event) => {
		event.preventDefault();
		event.stopPropagation();
		processDragEvent(event, event.target as HTMLElement, 'leave');
	}}
	ondragover={(event) => {
		event.preventDefault();
		event.stopPropagation();
		processDragEvent(event, event.target as HTMLElement, 'over', event.clientX, event.clientY);
	}}
	ondrop={(event) => {
		event.preventDefault();
		event.stopPropagation();

		processDragEvent(
			event,
			event.target as HTMLElement,
			'drop',
			Array.from(event.dataTransfer?.files || [])
		);
	}}
	onresize={() => (isWindowWIdthLimited = isWindowWidthLimitedChecker())}
/>

{#if $drag != null}
	<Overlay
		position={['offset', $drag![0], $drag![1]]}
		on:dismiss={() => {
			$drag = null;
		}}
	>
		<div class="drag">
			<i class="fa-solid fa-arrow-up-from-bracket"></i>
		</div>
	</Overlay>
{/if}

<div class="list-container">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		bind:this={list}
		class="list"
		class:mobile={$viewMode & ViewMode.Mobile}
		class:desktop={$viewMode & ViewMode.Desktop}
		in:scale|global={{ start: 0.9, duration: 250 }}
	>
		<div class="selection-container" bind:this={desktopSelectionBoxContainer}>
			{#if $desktopSelectionBoxCoordinates != null}
				{@const [x, y, w, h] = $desktopSelectionBoxCoordinates}

				<div
					bind:this={desktopSelectionBox}
					class="selection"
					style:margin-left="{Math.max(x, 0)}px"
					style:margin-top="{Math.max(y, 0)}px"
					style:width="{Math.min(Math.min(w, w + x), list.offsetWidth - x)}px"
					style:height="{Math.min(Math.min(h, h + y), list.scrollHeight - y)}px"
				></div>
			{/if}
		</div>

		<div
			class="inner-list"
			class:grid={$listViewMode === FileManagerViewMode.Grid}
			class:list={$listViewMode === FileManagerViewMode.List}
			class:limited={isWindowWIdthLimited}
			bind:this={innerList}
		>
			{#each files as file, index}
				{@render fileEntryView(index, file)}
			{/each}
		</div>
	</div>
</div>

<style lang="scss">
	div.list {
		flex-grow: 1;
		min-height: 0px;

		display: flex;
		flex-direction: column;

		overflow: hidden auto;
		min-height: 0px;
	}

	div.inner-list.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(192px, 1fr));

		padding: 16px;
	}

	div.inner-list.grid.limited {
		grid-template-columns: repeat(auto-fill, minmax(128px, 1fr));
	}

	button.file-entry.grid {
		display: flex;
		flex-direction: column;

		margin: 8px;
		padding: 4px;
		border-radius: 8px;

		background-color: var(--background);
		color: var(--onBackground);
		border: solid 1px var(--shadow);
	}

	button.file-entry.grid:hover {
		cursor: pointer;

		background-color: var(--backgroundVariant);
		color: var(--onBackgroundVariant);

		border-color: var(--onBackgroundVariant);
	}

	button.file-entry.grid.selected {
		background-color: var(--primary);
		color: var(--onPrimary);
	}

	div.thumbnail.grid {
		display: flex;
		flex-direction: column;

		align-items: center;
		justify-content: center;

		min-width: 100%;
		box-sizing: border-box;

		padding: 8px;

		aspect-ratio: 4 / 3;
		overflow: hidden;

		> img {
			min-width: 100%;
			min-height: 100%;
			max-width: 100%;
			max-height: 100%;

			border-radius: 8px;

			box-sizing: border-box;

			object-fit: cover;
		}

		> i {
			font-size: 4em;
		}
	}

	div.file-info.grid {
		display: flex;
		flex-direction: row;

		align-items: center;

		padding: 8px;
		gap: 8px;

		min-height: 1.2em;
		max-width: 100%;
		box-sizing: border-box;

		> p {
			flex-grow: 1;

			text-overflow: ellipsis;
			text-wrap: nowrap;
			text-align: start;

			max-lines: 1;
			max-width: calc(100%);

			overflow: hidden;
		}
	}

	div.selection-container {
		max-height: 0px;
		min-height: 0px;

		> div.selection {
			position: relative;

			box-sizing: border-box;

			background-color: var(--background);
			border: solid 1px var(--primaryContainer);
			opacity: 0.5;
		}
	}

	div.list-container {
		display: flex;
		flex-direction: column;

		flex-grow: 1;
		min-width: 0px;
		min-height: 0px;
	}

	div.drag {
		pointer-events: none;

		min-width: 0px;
		min-height: 0px;
		max-width: 0px;
		max-height: 0px;

		display: flex;
		align-items: center;
		justify-content: center;

		> i {
			font-size: 3em;
		}
	}
</style>
