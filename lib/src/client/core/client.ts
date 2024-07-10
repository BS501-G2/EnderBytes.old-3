import {
  baseConnectionFunctions,
  ConnectionFunctions,
  SocketWrapper,
  wrapSocket,
} from "../../shared/connection.js";
import { io, Socket } from "socket.io-client";
import { ApiServerFunctions } from "../../server.js";

export interface ApiClientClientFunctions extends ConnectionFunctions {}
export type Client = SocketWrapper<ApiServerFunctions, ApiClientClientFunctions, Socket>;

let connection: Client | null = null;

export const getConnection = (): Client =>
  (connection ??= wrapSocket(io("/", {}), {
    ...baseConnectionFunctions,
  }));
