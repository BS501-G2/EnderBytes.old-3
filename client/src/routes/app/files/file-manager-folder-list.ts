import type { FileResource } from '@rizzzi/enderdrive-lib/server';

export enum FileManagerViewMode {
	Grid,
	List
}

export interface FileManagerSelection {
	saved: FileResource[];

	type: 'shift' | 'ctrl' | 'normal';

	x: number;
	y: number;
	w: number;
	h: number;

	boxX: number;
	boxY: number;
	boxW: number;
	boxH: number;
	boxS: number;
}
