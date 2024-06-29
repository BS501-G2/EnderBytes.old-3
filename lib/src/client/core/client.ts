import { ApiServerFunctions } from "../../server/api/api-functions.js";
import {
  baseConnectionFunctions,
  ConnectionFunctions,
  SocketWrapper,
  wrapSocket,
} from "../../shared/connection.js";
import { io, Socket } from "socket.io-client";

export interface ClientFunctions extends ConnectionFunctions {}

let connection: SocketWrapper<
  ApiServerFunctions,
  ClientFunctions,
  Socket
> | null = null;

export const getConnection = () =>
  (connection ??= wrapSocket(io("http://10.1.0.58:8082"), {
    ...baseConnectionFunctions,
  }));
