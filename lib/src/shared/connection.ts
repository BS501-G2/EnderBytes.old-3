import { Buffer } from "buffer";

import type * as SocketIOServer from "socket.io";
import type * as SocketIOClient from "socket.io-client";

export type Socket = SocketIOServer.Socket | SocketIOClient.Socket;

export type ConnectionFunction<P extends any[], R> = (...args: P) => Promise<R>;

export interface ConnectionFunctions {
  [key: string]: ConnectionFunction<any[], any>;

  echo: <T>(data: T) => Promise<T>;
}

export const baseConnectionFunctions: ConnectionFunctions = {
  echo: async <T>(data: T) => data,
};

export enum MessageType {
  Request,
  ResponseOk,
  ResponseError,
}

export type Message<
  FL extends ConnectionFunctions,
  FR extends ConnectionFunctions
> = RequestMessage<FR> | ResponseOkMessage<FL> | ResponseErrorMessage;

export type RequestMessage<
  F extends ConnectionFunctions,
  K extends keyof F = keyof F
> = [
  type: MessageType.Request,
  id: number,
  name: K,
  parameters: Parameters<F[K]>
];

export type ResponseOkMessage<
  F extends ConnectionFunctions,
  K extends keyof F = keyof F
> = [type: MessageType.ResponseOk, id: number, data: ReturnType<F[K]>];

export type ResponseErrorMessage = [
  type: MessageType.ResponseError,
  id: number,
  name: string,
  message: string,
  stack?: string
];

export interface PendingRequest<
  F extends ConnectionFunctions,
  K extends keyof F = keyof F
> {
  resolve: (data: ReturnType<F[K]>) => void;
  reject: (error: Error) => void;
}

export interface PendingRequestMap<F extends ConnectionFunctions> {
  [id: string]: PendingRequest<F>;
}

export type SocketWrapper<
  FR extends ConnectionFunctions,
  FL extends ConnectionFunctions,
  S extends Socket
> = ReturnType<typeof wrapSocket<FR, FL, S>>;

export function wrapSocket<
  FR extends ConnectionFunctions,
  FL extends ConnectionFunctions,
  S extends Socket
>(
  socket: S,
  map: FL,
  beforeCall?: (func: () => Promise<void>) => Promise<void>,
  onData?: (
    ...args:
      | [type: "send", message: Message<FL, FR>]
      | [type: "receive", message: Message<FR, FL>]
  ) => void
) {
  const pending: PendingRequestMap<FR> = {};

  const receive = (...message: Message<FR, FL>) => {
    onData?.("receive", message);

    if (message[0] === MessageType.ResponseOk) {
      const [, id, data] = message;

      if (!(id in pending)) {
        return;
      }

      const {
        [id]: { resolve },
      } = pending;

      resolve(data);
      delete pending[id];
    } else if (message[0] === MessageType.ResponseError) {
      const [, id, name, errorMessage, stack] = message;

      if (!(id in pending)) {
        return;
      }

      const {
        [id]: { reject },
      } = pending;
      reject(Object.assign(new Error(errorMessage), { name, stack }));
      delete pending[id];
    } else if (message[0] === MessageType.Request) {
      const [, id, name, args] = message;
      const { [name]: func } = map;

      if (!(name in map)) {
        send(
          MessageType.ResponseError,
          id,
          "InvalidFunctionName",
          `Function does not exist: ${name as string}`
        );
        return;
      }

      (async () => {
        if (beforeCall != null) {
          return await beforeCall(() => func(...args));
        } else {
          return await func(...args);
        }
      })()
        .then((data: Awaited<ReturnType<typeof func>>) =>
          send(MessageType.ResponseOk, id, data)
        )
        .catch((error: unknown) => {
          const sendError = (name: string, message: string, stack?: string) =>
            send(MessageType.ResponseError, id, name, message, stack);

          if (error instanceof Error) {
            sendError(error.name, error.message, error.stack);
          } else {
            sendError("Uncaught", `${error}`);
          }
        });
    }
  };

  const send = (...message: Message<FL, FR>) => {
    if (destroyed) {
      throw new Error("Destroyed");
    }

    const BufferC = (() => {
      if (typeof (globalThis as any).Window === "function") {
        return Buffer;
      } else {
        return globalThis.Buffer;
      }
    })();

    const traverse = <T>(obj: T): T => {
      if (BufferC.isBuffer(obj) || obj instanceof Uint8Array) {
        return new Uint8Array(obj).buffer as T;
      } else if (Array.isArray(obj)) {
        for (let index = 0; index < obj.length; index++) {
          const a = traverse(obj[index]);

          if (a != obj[index]) {
            obj[index] = a;
          }
        }
      } else if (typeof obj === "object") {
        for (const key in obj) {
          const a = traverse(obj[key]);

          if (obj[key] != a) {
            obj[key] = a;
          }
        }
      }

      return obj;
    };

    const sanitizedMessage = traverse(message);

    onData?.("send", sanitizedMessage);
    socket.send(...sanitizedMessage);
  };

  socket.on("message", receive);
  socket.on("disconnect", (reason) => {
    for (const pendingId in pending) {
      const pendingEntry = pending[pendingId];

      if (pendingEntry == null) {
        continue;
      }

      pendingEntry.reject(new Error("Disconnected. Try again later"));
    }
  });
  let destroyed: boolean = false;

  const call = <K extends keyof FR, T extends FR[K]>(
    name: K,
    ...args: Parameters<T>
  ): Promise<Awaited<ReturnType<T>>> =>
    new Promise((resolve, reject: (error: Error) => void) => {
      let id: number;
      do {
        id = Math.floor(Math.random() * Math.pow(2, 31));
      } while (id in pending);

      pending[id] = { resolve, reject };
      send(MessageType.Request, id, name, args);
    });

  const obj: {
    destroy: () => void;
    funcs: FR;
  } = {
    destroy: () => {
      (socket.off as any)("message", receive);
      destroyed = true;

      for (const id in pending) {
        pending[id].reject(new Error("Destroyed"));
      }
    },

    funcs: new Proxy<FR>({} as never, {
      get: (_, key) => {
        return (...args: never[]) => call(key as never, ...(args as never));
      },
    }),
  };

  return obj;
}
