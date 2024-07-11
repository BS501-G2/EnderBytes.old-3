import { Socket } from "socket.io";
import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";
import { Server } from "../core/server.js";
import { ServerConnection, ServerConnectionContext } from "./connection.js";

export interface ServerConnectionManagerData {
  connections: Record<number, ServerConnection>;
  contexts: Record<number, ServerConnectionContext>;

  handle: (socket: Socket) => void;
}

export class ServerConnectionManager extends Service<
  ServerConnectionManagerData,
  []
> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<ServerConnectionManagerData> =
      null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<ServerConnectionManagerData>;

  get server() {
    return this.#server;
  }

  get #data() {
    return this.#getData();
  }

  get handle() {
    return this.#data.handle;
  }

  #getConnectionContext(connection: ServerConnection): ServerConnectionContext {
    const { currentUserId } = connection;

    if (currentUserId == null) {
      throw new Error("Not logged in");
    }

    const context = Object.assign(
      (this.#data.contexts[currentUserId] ??= {
        updateTime: Date.now(),
      }),
      { updateTime: Date.now() }
    );

    return context;
  }

  async run(
    setData: ServiceSetDataCallback<ServerConnectionManagerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    let connectionId: number = 0;

    const { connections, contexts }: ServerConnectionManagerData = setData({
      connections: {},
      contexts: {},
      handle: (socket) => {
        const connection: ServerConnection = new ServerConnection(
          this,
          ++connectionId,
          socket,
          {
            onDisconnect: () => {
              delete connections[connection.id];
            },
            getContext: () => this.#getConnectionContext(connection),
          }
        );

        connections[connection.id] = connection;
      },
    });

    const checkContexts = () => {
      for (const userId in contexts) {
        const { [userId as never]: context } = contexts;

        if (Date.now() - context.updateTime > 120000) {
          delete contexts[userId as never];
        }
      }

      check = setTimeout(checkContexts, 10000);
    };

    let check: NodeJS.Timeout = setTimeout(checkContexts, 1000);

    await new Promise<void>(onReady);

    clearTimeout(check);
  }
}
