import HTTP from "http";
import * as SocketIO from "socket.io";

import { LogLevel, Service } from "../../shared/service.js";
import { Server } from "../core/server.js";
import { ConnectionFunctions, wrapSocket } from "../../shared/connection.js";
import { ClientFunctions } from "../../client.js";
import {
  Authentication,
  getApiFunctions,
  ServerStatus,
} from "./api-functions.js";
import {
  FileAccessLevel,
  UserAuthenticationType,
  UserResolvePayload,
  UserRole,
} from "../../shared.js";
import { UpdateUserOptions, UserManager, UserResource } from "../db/user.js";
import { QueryOptions } from "../resource.js";
import { UnlockedUserAuthentication } from "../db/user-authentication.js";
import { FileResource } from "../db/file.js";
import { FileAccessResource } from "../db/file-access.js";
import { FileSnapshotResource } from "../db/file-snapshot.js";

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

export interface ApiServerFunctions extends ConnectionFunctions {
  authenticate: (
    username: string,
    payloadType: UserAuthenticationType,
    payload: Uint8Array
  ) => Promise<Authentication>;

  isAuthenticationValid: (authentication: Authentication) => Promise<boolean>;

  getServerStatus: () => Promise<ServerStatus>;

  createAdminUser: (
    username: string,
    firstName: string,
    middleName: string | null,
    lastName: string,
    password: string
  ) => Promise<UserResource>;

  getUser: (
    authentication: Authentication | null,
    user: UserResolvePayload
  ) => Promise<UserResource | null>;

  listUsers: (
    authentication: Authentication | null,
    options?: QueryOptions<UserResource, UserManager>
  ) => Promise<UserResource[]>;

  createUser: (
    authentication: Authentication | null,
    username: string,
    firstName: string,
    middleName: string | null,
    lastName: string,
    role: UserRole
  ) => Promise<
    [
      user: UserResource,
      UnlockedUserAuthentication: UnlockedUserAuthentication,
      password: string
    ]
  >;

  updateUser: (
    authentication: Authentication | null,
    id: number,
    newData: UpdateUserOptions
  ) => Promise<UserResource>;

  suspendUser: (
    authentication: Authentication | null,
    id: number
  ) => Promise<UserResource>;

  createFile: (
    authentication: Authentication | null,
    parentFolderId: number,
    name: string,
    content: Uint8Array
  ) => Promise<FileResource>;

  createFolder: (
    authentication: Authentication | null,
    parentFolderId: number,
    name: string
  ) => Promise<FileResource>;

  scanFolder: (
    authentication: Authentication | null,
    folderId: number
  ) => Promise<FileResource[]>;

  grantAccessToUser: (
    authentication: Authentication | null,
    fileId: number,
    targetUserId: number,
    type: FileAccessLevel
  ) => Promise<FileAccessResource>;

  revokeAccessFromUser: (
    authentication: Authentication | null,
    fileId: number,
    targetUserId: number
  ) => Promise<void>;

  listPathChain: (
    authentication: Authentication | null,
    fileId: number
  ) => Promise<FileResource[]>;

  listFileAccess: (
    authentication: Authentication | null,
    fileId: number
  ) => Promise<FileAccessResource[]>;

  listSharedFiles: (
    authentication: Authentication | null
  ) => Promise<FileAccessResource[]>;

  getFile: (
    authentication: Authentication | null,
    fileId: number | null
  ) => Promise<FileResource>;

  listFileSnapshots: (
    authentication: Authentication | null,
    fileId: number
  ) => Promise<FileSnapshotResource[]>;

  readFile: (
    authentication: Authentication | null,
    fileId: number,
    offset?: number,
    length?: number
  ) => Promise<Uint8Array>;

  moveFile: (
    authentication: Authentication | null,
    fileIds: number[],
    newParentFolderId: number
  ) => Promise<void>;

  getFileMimeType: (
    authentication: Authentication | null,
    fileId: number,
    mime?: boolean
  ) => Promise<string>;

  copyFile: (
    authentication: Authentication | null,
    fileId: number,
    destinationId: number
  ) => Promise<void>;

  searchUser: (
    authentication: Authentication | null,
    searchString: string
  ) => Promise<UserResource[]>;

  getFileSize: (
    authentication: Authentication | null,
    fileId: number
  ) => Promise<number>;

  scanFile: (
    authentication: Authentication | null,
    fileId: number
  ) => Promise<string[]>;
}
