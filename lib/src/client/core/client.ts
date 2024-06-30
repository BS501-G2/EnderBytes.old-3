import { ApiServerFunctions } from "../../server/api/api-functions.js";
import {
  baseConnectionFunctions,
  ConnectionFunctions,
  SocketWrapper,
  wrapSocket,
} from "../../shared/connection.js";
import { io, Socket } from "socket.io-client";
import SocketIOCustomParser from "socket.io-msgpack-parser";

export interface ClientFunctions extends ConnectionFunctions {}
export type Client = SocketWrapper<ApiServerFunctions, ClientFunctions, Socket>;

let connection: Client | null = null;

export const getConnection = (): Client =>
  (connection ??= wrapSocket(io("/", {}), {
    ...baseConnectionFunctions,
  }));
