import {
  LogLevel,
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "./service.js";

import type * as SocketIOServer from "socket.io";
import type * as SocketIOClient from "socket.io-client";

export type Socket = SocketIOServer.Socket | SocketIOClient.Socket;

export interface ServerFunctions extends ConnectionFunctions {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  echo: [[data: any], any]
}

export interface ClientFunctions extends ConnectionFunctions {

}

export enum ConnectionMessageType {
  Request,
  ResponseOk,
  ResponseError,
}

export type ConnectionFunction<T extends unknown[], R> = (
  ...args: T
) => Promise<Awaited<R>> | Awaited<R>;

export interface ConnectionFunctions {
  [key: string]: [parameters: unknown[], response: unknown];
}

export type ConnectionFunctionMap<T extends ConnectionFunctions> = {
  [key in keyof T]: ConnectionFunction<T[key][0], T[key][1]>;
};

export type ConnectionMessageData<
  FL extends ConnectionFunctions,
  FR extends ConnectionFunctions,
  KL extends keyof FL = keyof FL,
  KR extends keyof FR = keyof FR
> =
  | [
    type: ConnectionMessageType.Request,
    id: number,
    name: KR,
    parameters: FR[KR][0]
  ]
  | [type: ConnectionMessageType.ResponseOk, id: number, response: FL[KL][1]]
  | [
    type: ConnectionMessageType.ResponseError,
    id: number,
    name: string,
    message: string,
    stack?: string
  ];

export abstract class Connection<
  S extends Socket,
  C extends Connection<S, C, FL, FR>,
  FL extends ConnectionFunctions,
  FR extends ConnectionFunctions
> {
  public constructor(socket: S, functions: ConnectionFunctionMap<FL>) {
    this.#socket = socket;
    this.#instance = null;
    this.#functions = functions;
    this.#pending = new Map();
  }

  readonly #functions: ConnectionFunctionMap<FL>;
  readonly #socket: S;
  readonly #pending: Map<
    number,
    {
      resolve: (data: Awaited<FR[keyof FR][1]>) => void;
      reject: (error: Error) => void;
    }
  >;
  #instance: Promise<void> | null;

  call<K extends keyof FL>(
    name: K,
    ...parameters: FL[K][0]
  ): Promise<Awaited<FL[K][1]>> {
    return new Promise((resolve, reject) => {
      let id: number
      do {
        id = Math.floor(Math.random() * 1000000000)
      } while (this.#pending.has(id))


      this.#pending.set(id, { resolve, reject, })
      this.#send(ConnectionMessageType.Request, id, name as never, ...parameters as never);
    });
  }

  #send(...args: ConnectionMessageData<FL, FR>): void {
    this.#socket.send(...args);
  }

  async #receive(...args: ConnectionMessageData<FL, FR>): Promise<void> {
    if (args[0] === ConnectionMessageType.Request) {
      const [, id, name, parameters] = args;

      try {
        this.#socket.send([
          ConnectionMessageType.ResponseOk,
          id,
          await this.#functions[name as never](...(parameters as never)),
        ]);
      } catch (error: unknown) {
        const sendError = (error: Error) => {
          this.#socket.send([
            ConnectionMessageType.ResponseError,
            error.name,
            error.message,
            error.stack,
          ]);
        };

        sendError(error instanceof Error ? error : new Error(`${error}`));
      }
    } else if (args[0] === ConnectionMessageType.ResponseError) {
      const [, id, name, message, stack] = args;

      const data = this.#pending.get(id);
      if (data == null) {
        return;
      }

      this.#pending.delete(id);
      data.reject(Object.assign(new Error(message), { name, stack }));
    } else if (args[0] === ConnectionMessageType.ResponseOk) {
      const [, id, response] = args;

      const data = this.#pending.get(id);
      if (data == null) {
        return;
      }

      this.#pending.delete(id);
      data.resolve(response as never);
    }
  }

  async #handle(): Promise<void> {
    const socket = this.#socket;

    socket.on("message", (...data) => this.#receive(...(data as never)));

    await new Promise<void>((resolve) => {
      if (!socket.connected) {
        resolve();
      } else {
        socket.on("disconnect", () => resolve());
      }
    });
  }

  handle(): Promise<void> {
    return (this.#instance ??= this.#handle().finally(
      () => (this.#instance = null)
    ));
  }
}

export interface ConnectionManagerData<
  S extends Socket,
  C extends Connection<S, C, FL, FR>,
  FL extends ConnectionFunctions,
  FR extends ConnectionFunctions
> {
  connections: C[];

  handle: (socket: SocketIOClient.Socket) => void;
}

export abstract class ConnectionManager<
  S extends Socket,
  C extends Connection<S, C, FL, FR>,
  FL extends ConnectionFunctions,
  FR extends ConnectionFunctions
> extends Service<ConnectionManagerData<S, C, FL, FR>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public constructor(downstream?: Service<any>) {
    let getData: ServiceGetDataCallback<ConnectionManagerData<S, C, FL, FR>> =
      null as never;
    super((func) => (getData = func), downstream);

    this.#getData = getData;
  }

  readonly #getData: ServiceGetDataCallback<
    ConnectionManagerData<S, C, FL, FR>
  >;
  get #data() {
    return this.#getData;
  }

  abstract newConnection(socket: Socket): C;

  async run(
    setData: ServiceSetDataCallback<ConnectionManagerData<S, C, FL, FR>>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const data = setData({
      connections: [],
      handle: (socket) => {
        const { connections } = data;
        const connection = this.newConnection(socket);

        connections.push(connection);
        connection
          .handle()
          .catch((error: unknown) =>
            this.log(
              LogLevel.Error,
              `Error: ${error instanceof Error ? error.stack : `${error}`}`
            )
          )
          .finally(() => {
            connections.splice(connections.indexOf(connection), 1);
          });
      },
    });

    await new Promise<void>(onReady);
  }
}
