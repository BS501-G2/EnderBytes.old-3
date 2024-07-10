import { Socket } from "socket.io";
import {
  Authentication,
  AuthenticationType,
  baseConnectionFunctions,
  ConnectionFunctions,
  Service,
  ServiceGetDataCallback,
  SocketWrapper,
  UserResolvePayload,
  wrapSocket,
} from "../../shared.js";
import { ClientFunctions } from "../../client/core/connection.js";
import { Database } from "../database.js";
import { Server } from "../core/server.js";

export interface ServerFunctions extends ConnectionFunctions {
  restore: (authentication: Authentication) => Promise<boolean>;

  authenticate: (
    user: UserResolvePayload,
    type: AuthenticationType,
    payload: Uint8Array
  ) => Promise<Authentication>;
}

export class ServerConnection {
  public constructor(database: Database, socket: Socket) {
    this.#wrapper = wrapSocket((this.#io = socket), this.#server);
  }

  readonly #io: Socket;
  readonly #wrapper: SocketWrapper<ClientFunctions, ServerFunctions, Socket>;

  get #client() {
    return this.#wrapper.funcs;
  }

  get #server(): ServerFunctions {
    return {
      ...baseConnectionFunctions,

      restore: async (authentication) => {},

      authenticate: async () => {},
    };
  }

  #authenticate() {}
}

export interface ServerConnectionContext {}

export interface ServerConnectionManagerData {}

export class ServerConnectionManager extends Service<
  ServerConnectionManagerData,
  []
> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<ServerConnectionManagerData> =
      null as never;

    super((func) => (getData = func), server);

    this.#server = server;
  }

  readonly #server: Server;
}
