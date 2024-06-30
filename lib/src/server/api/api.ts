import HTTP from "http";
import * as SocketIO from "socket.io";

import { LogLevel, Service } from "../../shared/service.js";
import { Server } from "../core/server.js";
import { wrapSocket } from "../../shared/connection.js";
import { ClientFunctions } from "../../client.js";
import { ApiServerFunctions, getApiFunctions } from "./api-functions.js";

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

  #wrapSocket(socket: SocketIO.Socket) {
    return wrapSocket<ClientFunctions, ApiServerFunctions, SocketIO.Socket>(
      socket,
      getApiFunctions(this.#server),
      (func) => this.#server.database.transact(func)
    );
  }

  async run(
    setData: (instance: ApiServerData) => void,
    onReady: (onStop: () => void) => void,
    ...[port]: ApiServerOptions
  ): Promise<void> {
    const httpServer = HTTP.createServer();
    this.log(LogLevel.Info, "HTTP initialized.");
    const sio = new SocketIO.Server({
      cors: { origin: "*", allowedHeaders: "*", methods: "*" },
      maxHttpBufferSize: 1024 * 1024 * 256,
    });
    this.log(LogLevel.Info, "Socket.IO handler initialized.");

    setData({ httpServer, sio });

    sio.attach(httpServer);
    this.log(LogLevel.Debug, "Socket.IO hooks attached.");

    sio.on("connection", (socket) => this.#wrapSocket(socket));

    httpServer.listen(port);
    await new Promise<void>((resolve) => onReady(resolve));

    httpServer.close();
    sio.close();
    this.log(LogLevel.Debug, "HTTP & Socket.IO server closed.");
  }
}
