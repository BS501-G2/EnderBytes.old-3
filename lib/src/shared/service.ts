export interface ServiceRuntime<T = unknown> {
  onStop: ServiceStopCallback;

  resolve: () => void;
  reject: () => void;

  data: [T] | null;
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
    downstream?: Service<any, any[]> | null
  ) {
    this.#instance = null;
    this.#downstream = downstream ?? null;

    onData?.(() => this.#instanceData);
  }

  readonly #downstream: Service | null;
  #instance: ServiceRuntime<T> | null;

  get #instanceData(): T {
    if (this.#instance == null) {
      throw new Error("Not started");
    } else if (this.#instance.data == null) {
      throw new Error("Not initialized");
    }

    return this.#instance.data[0];
  }

  abstract run(
    setData: ServiceSetDataCallback<T>,
    onReady: ServiceReadyCallback,
    ...args: A
  ): Promise<void> | void;

  public async stop(): Promise<void> {
    if (this.#instance) {
      this.log(LogLevel.Info, "Stopping...");
      await this.#instance.onStop?.();
      this.log(LogLevel.Info, "Service has stopped.");
    }
  }

  public start(...args: A): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (this.#instance != null) {
        throw new Error("Already running.");
      }

      const runtime: ServiceRuntime = (this.#instance = {
        resolve: null as never,
        reject: null as never,
        onStop: null as never,

        data: null,
      });
      this.log(LogLevel.Debug, "Runtime data has been set.");

      const setInstance: ServiceSetDataCallback<T> = (data: T) => {
        runtime.data = [data];
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
              "Service has stopped initializing with an error: " + (error instanceof Error ? error.stack : `${error as string}`)
            );
            reject(error);
          }
        })
        .finally(() => {
          this.#instance = null;
          this.log(LogLevel.Debug, "Service runtime data has been cleaned up.");
        });
    });
  }

  #log(level: LogLevel, message: string, downstream: string[]): void {
    const {
      constructor: { name },
    } = this;

    if (this.#downstream != null) {
      this.#downstream.#log(level, message, [name, ...downstream]);
    } else {
      const timestamp = new Date().getTime();
      const stack: string[] = [name, ...downstream];

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
