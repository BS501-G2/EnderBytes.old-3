export interface ServiceRuntime<T = unknown> {
  promise: Promise<void>;

  onStop: (() => void) | null;

  instance: [T] | null;
}

export abstract class Service<T = unknown, A extends unknown[] = never[]> {
  public constructor(onGetInstanceData: (getInstanceData: () => T) => void) {
    this.#runtime = null;

    onGetInstanceData(() => this.#instanceData);
  }

  get #instanceData(): T {
    if (this.#runtime == null) {
      throw new Error("Not started");
    } else if (this.#runtime.instance == null) {
      throw new Error("Not initialized");
    }

    return this.#runtime.instance[0];
  }

  abstract run(
    setData: (instance: T) => void,
    onReady: (onStop: () => void) => void,
    ...args: A
  ): Promise<void>;

  #runtime: ServiceRuntime<T> | null;

  public async stop(): Promise<void> {
    if (this.#runtime) {
      this.#runtime.onStop?.();
    }
  }

  public start(...args: A): Promise<void> {
    const promise = new Promise<void>((resolve, reject) => {
      const run = async () => {
        this.log(LogLevel.Debug, "Preparing to start.");

        try {
          if (this.#runtime != null) {
            this.log(LogLevel.Debug, "Already started.");
            throw new Error("Already started");
          }

          this.log(LogLevel.Debug, "Setting runtime data.");
          const runtime: ServiceRuntime<T> = (this.#runtime = {
            onStop: null,
            promise,
            instance: null,
          });

          this.log(LogLevel.Debug, "Starting service...");
          let isReady: boolean = false;
          await this.run(
            (instance) => {
              runtime.instance = [instance];
              this.log(LogLevel.Debug, "Instance data has been set.");
            },
            (onStop) => {
              if (isReady) {
                return;
              }

              runtime.onStop = onStop;
              resolve();
              isReady = true;
              this.log(LogLevel.Debug, "Service is now ready.");
            },
            ...args
          );
        } finally {
          this.#runtime = null;
        }
      };

      setTimeout(() => run().catch(reject), 0);
    });

    return promise;
  }

  public async log(level: LogLevel, message: string): Promise<void> {
    console.log(
      `[${LogLevel[level]}] [${new Date()}] [${
        this.constructor.name
      }] ${message}`
    );
  }
}

export enum LogLevel {
  Critical = "Critical",
  Error = "Error",
  Warning = "Warning",
  Info = "Info",
  Debug = "Debug",
}
