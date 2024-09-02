export type BackgroundTaskSetStatusFunction = (
	message?: string | null,
	progressPercentage?: number | null
) => void;

export type BackgroundTaskCallback<T> = (
	client: BackgroundTaskClient<T>,
	setStatus: BackgroundTaskSetStatusFunction
) => Promise<T> | T;

export interface BackgroundTask<T> {
	name: string;
	message: string | null;
	progress: number | null;
	retryable: boolean;
	status: BackgroundTaskStatus;
	cancelled: boolean;
	autoDismiss: boolean;
	hidden: boolean;
	lastUpdated: number;

	isDismissed: boolean;

	client: BackgroundTaskClient<unknown>;
	run: () => Promise<T>;
	dismiss: () => void;
	cancel: () => void;
}

export interface BackgroundTaskClient<T> {
	name: string;
	status: BackgroundTaskStatus;
	retryable: boolean;
	cancelled: boolean;
	run: () => Promise<T>;
	dismiss: () => void;
	task: Promise<T> | null;
	cancel: () => void;
}

export enum BackgroundTaskStatus {
	Ready,
	Running,
	Failed,
	Cancelled,
	Done
}
