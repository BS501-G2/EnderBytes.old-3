export interface ServiceRuntime<T = unknown> {
  onStop: ServiceStopCallback;

  resolve: () => void;
  reject: () => void;

  instance: [T] | null;
}

export type ServiceGetDataCallback<T = unknown> = () => T;
export type ServiceOnGetDataCallback<T = unknown> = (
  func: ServiceGetDataCallback<T>
) => void;
export type ServiceSetDataCallback<T = unknown> = (data: T) => T;
export type ServiceReadyCallback = (onStop: ServiceStopCallback) => void;
export type ServiceStopCallback = () => Promise<void> | void;

export abstract class Service<T = unknown, A extends unknown[] = never[]> {
  public constructor(
    onData?: ServiceOnGetDataCallback<T> | null,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upstreamService?: Service<any, any[]> | null
  ) {
    this.#runtime = null;
    this.#upstreamService = upstreamService ?? null;

    onData?.(() => this.#instanceData);
  }

  readonly #upstreamService: Service | null;
  #runtime: ServiceRuntime<T> | null;

  get #instanceData(): T {
    if (this.#runtime == null) {
      throw new Error("Not started");
    } else if (this.#runtime.instance == null) {
      throw new Error("Not initialized");
    }

    return this.#runtime.instance[0];
  }

  abstract run(
    setData: ServiceSetDataCallback<T>,
    onReady: ServiceReadyCallback,
    ...args: A
  ): Promise<void> | void;

  public async stop(): Promise<void> {
    if (this.#runtime) {
      this.log(LogLevel.Info, "Stopping...");
      await this.#runtime.onStop?.();
      this.log(LogLevel.Info, "Service has stopped.");
    }
  }

  public start(...args: A): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.#runtime != null) {
        throw new Error("Already running.");
      }

      const runtime: ServiceRuntime = (this.#runtime = {
        resolve: null as never,
        reject: null as never,
        onStop: null as never,

        instance: null,
      });
      this.log(LogLevel.Debug, "Runtime data has been set.");

      const setInstance: ServiceSetDataCallback<T> = (data: T) => {
        runtime.instance = [data];
        return data;
      };

      let isReady: boolean = false;
      const onReady: ServiceReadyCallback = (onStop) => {
        runtime.onStop = onStop;
        isReady = true;
        resolve();
        this.log(LogLevel.Debug, "Service has started.");
      };

      (async () => await this.run(setInstance, onReady, ...args))()
        .then(() => {
          if (!isReady) {
            this.log(
              LogLevel.Debug,
              "Service has stopped without sending ready signal."
            );
            resolve();
          }
        })
        .catch((error: unknown) => {
          if (!isReady) {
            this.log(
              LogLevel.Debug,
              "Service has stopped initializing with an error."
            );
            reject(error);
          }
        })
        .finally(() => {
          this.#runtime = null;
          this.log(LogLevel.Debug, "Service runtime data has been cleaned up.");
        });
    });
  }

  #log(level: LogLevel, message: string, upstream: string[]): void {
    if (this.#upstreamService != null) {
      this.#upstreamService.#log(level, message, [
        this.constructor.name,
        ...upstream,
      ]);
    } else {
      const timestamp = new Date().getTime();
      const stack: string[] = [this.constructor.name, ...upstream];

      console.log(
        `[${timestamp}] [${stack.join(" > ")}] [${LogLevel[level]}] ${message}`
      );
    }
  }

  public log(level: LogLevel, message: string) {
    return this.#log(level, message, []);
  }
}

export enum LogLevel {
  Critical = "Critical",
  Error = "Error",
  Warning = "Warning",
  Info = "Info",
  Debug = "Debug",
}
