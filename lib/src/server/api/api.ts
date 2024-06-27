import HTTP from "http";
import * as SocketIO from "socket.io";

import { LogLevel, Service } from "../../shared/service.js";
import { Server } from "../core/server.js";

export interface ApiServerData {
  httpServer: HTTP.Server;
  sio: SocketIO.Server;
}

export type ApiServerOptions = [port: number];

export class ApiServer extends Service<ApiServerData, ApiServerOptions> {
  public constructor(server: Server) {
    super(null, server);

    this.#server = server;
  }

  #server: Server;

  async #handle(connection: SocketIO.Socket): Promise<void> {}

  async run(
    setData: (instance: ApiServerData) => void,
    onReady: (onStop: () => void) => void,
    ...[port]: ApiServerOptions
  ): Promise<void> {
    const httpServer = HTTP.createServer();
    this.log(LogLevel.Info, "HTTP initialized.");
    const sio = new SocketIO.Server({
      cors: {
        origin: "*",
      },
    });
    this.log(LogLevel.Info, "Socket.IO handler initialized.");

    const data = setData({ httpServer, sio });

    sio.attach(httpServer);
    sio.on("connection", (socket) => {
      const promise = this.#handle(socket);

      const onError = (error: Error) => {
        this.log(LogLevel.Error, `Socket error: ${error.stack}`);
      };

      promise.catch((error: unknown) => {
        if (error instanceof Error) {
          onError(error);
        } else {
          onError(new Error(`${error}`));
        }
      });
    });
    this.log(LogLevel.Debug, "Socket.IO hooks attached.");

    httpServer.listen(port);
    await new Promise<void>((resolve) => onReady(resolve));

    httpServer.close();
    sio.close();
    this.log(LogLevel.Debug, "HTTP & Socket.IO server closed.");
  }
}
