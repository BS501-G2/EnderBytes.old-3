import { io, Socket } from "socket.io-client";
import {
  Authentication,
  baseConnectionFunctions,
  ConnectionFunctions,
  SocketWrapper,
  wrapSocket,
} from "../../shared.js";
import { ServerFunctions } from "../../server/api/connection.js";

export interface ClientFunctions extends ConnectionFunctions {}

export interface ClientConnectionOptions {
  getAuth?: () => Authentication | null;
}

export class ClientConnection {
  public constructor(getAuth: null | (() => Authentication | null)) {
    this.#wrapper = wrapSocket((this.#io = io("/")), this.#client);

    this.#io.on("connect", () => this.#restore(getAuth?.() ?? null));
    this.#io.on("reconnect", () => this.#restore(getAuth?.() ?? null));
  }

  async #restore(authentication: Authentication | null): Promise<void> {
    const { restore } = this.#server;

    if (authentication == null) {
      return;
    }

    await restore(authentication);
  }

  readonly #io: Socket;
  readonly #wrapper: SocketWrapper<ServerFunctions, ClientFunctions, Socket>;

  get #server() {
    return this.#wrapper.funcs;
  }

  get #client(): ClientFunctions {
    return {
      ...baseConnectionFunctions,
    };
  }
}
