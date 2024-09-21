import type { FileResource } from '@rizzzi/enderdrive-lib/server';

export type FileManagerViewMode = 'grid' | 'list'

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
