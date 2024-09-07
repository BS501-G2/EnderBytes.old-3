import { io, Socket } from "socket.io-client";
import {
  Authentication,
  baseConnectionFunctions,
  ConnectionFunctions,
  SocketWrapper,
  wrapSocket,
} from "../../shared.js";
import { ServerFunctions } from "../../server/api/connection-functions.js";
import { ClientFunctions } from "./connection-functions.js";

export interface ClientConnectionOptions {
  getAuth?: () => Authentication | null;
}

export class ClientConnection {
  public constructor(
    getAuth: null | (() => Authentication | null) = null,
    setAuthentication: (authentication: Authentication | null) => void,

    url?: string
  ) {
    this.#wrapper = wrapSocket(
      (this.#io = io(url ?? "/", {
        path: "/api/socket.io",
      })),
      this.#clientFunctions,
      undefined
      // (...message) => {
      //   console.log(...message);
      // }
    );
    this.#setAuthentication = setAuthentication;
    this.#preConnect = [];

    this.#io.on("connect", () => this.#restore(getAuth?.() ?? null));
    this.#io.on("reconnect", () => this.#restore(getAuth?.() ?? null));
  }

  async #restore(authentication: Authentication | null): Promise<void> {
    const { restore } = this.#serverFunctions;

    try {
      if (authentication == null) {
        return;
      }

      await restore(authentication);
    } finally {
      for (const preConnext of this.#preConnect.splice(
        0,
        this.#preConnect.length
      )) {
        await preConnext();
      }
    }
  }

  readonly #preConnect: (() => Promise<void>)[];
  readonly #io: Socket;
  readonly #wrapper: SocketWrapper<ServerFunctions, ClientFunctions, Socket>;
  readonly #setAuthentication: (authentication: Authentication | null) => void;

  get #serverFunctions(): ServerFunctions {
    const funcs = this.#wrapper.funcs;

    const wrapFunctions = (
      funcs: ServerFunctions,
      wrapped: Partial<ServerFunctions>
    ): ServerFunctions => {
      const getFunc: <T extends keyof ServerFunctions>(
        funcs: ServerFunctions,
        key: T
      ) => ServerFunctions[T] = (funcs, key) => {
        const wrap = wrapped[key];

        if (wrap != null) {
          return wrap;
        }

        return funcs[key];
      };

      const getFunc2: <T extends keyof ServerFunctions>(
        funcs: ServerFunctions,
        key: T
      ) => ServerFunctions[T] = (...args) => {
        const func = getFunc(...args);

        return (...args) => {
          if (this.#io.connected) {
            return func(...args);
          }

          return new Promise((resolve, reject) =>
            this.#preConnect.push(() => func(...args).then(resolve, reject))
          );
        };
      };

      const proxy = new Proxy(funcs, {
        get: getFunc2 as never,
      });

      return proxy;
    };

    return wrapFunctions(funcs, {
      restore: (authentication) =>
        funcs.restore(authentication).catch((error: Error) => {
          if (error.message === "Invalid login details") {
            this.#setAuthentication(null);
          }

          throw error;
        }),

      authenticate: (user, type, payload) =>
        funcs.authenticate(user, type, payload).then((authentication) => {
          // console.log("New Session:", authentication?.userSessionKey.length);

          this.#setAuthentication(authentication);
          return authentication;
        }),
    });
  }

  get #clientFunctions(): ClientFunctions {
    return {
      ...baseConnectionFunctions,
    };
  }

  get serverFunctions() {
    return this.#serverFunctions;
  }
}
