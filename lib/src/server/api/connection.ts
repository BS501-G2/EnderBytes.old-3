import { Socket } from "socket.io";
import {
  ClientFunctions,
  Connection,
  ConnectionManager,
  ServerFunctions
} from "../../shared/connection.js";
import { ApiServer } from "./api.js";

export class ServerConnection extends Connection<Socket, ServerConnection, ServerFunctions, ClientFunctions> {
  public constructor(socket: Socket) {
    super(socket, {
      echo: (data) => data
    })
  }
}

export class ServerConnectionManager extends ConnectionManager<Socket, ServerConnection, ServerFunctions, ClientFunctions> {
  newConnection(socket: Socket): ServerConnection {
    return new ServerConnection(socket);
  }
}
