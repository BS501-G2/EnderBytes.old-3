import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";
import { Server } from "./server.js";
import HTTP from "http";
import SocketIOServer from "socket.io";

export interface HttpListenerData {
  http: HTTP.Server;
}

export type HttpListenerOptions = [port: number];

export class HttpListener extends Service<
  HttpListenerData,
  HttpListenerOptions
> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<HttpListenerData> = null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  async run(
    setData: ServiceSetDataCallback<HttpListenerData>,
    onReady: ServiceReadyCallback,
    ...[port]: HttpListenerOptions
  ): Promise<void> {
    const http = HTTP.createServer();

    setData({ http });

    http.listen(port);

    await new Promise<void>(onReady);

    await new Promise<void>((resolve, reject) => {
      http.close((error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<HttpListenerData>;

  public attachIo(io: SocketIOServer.Server) {
    const { http } = this.#getData();

    io.attach(http, {
      path: "/api/socket.io",
    });
  }
}
