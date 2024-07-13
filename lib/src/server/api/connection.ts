import { Socket } from "socket.io";
import {
  ApiError,
  ApiErrorType,
  Authentication,
  baseConnectionFunctions,
  ConnectionFunctions,
  FileAccessLevel,
  FileLogType,
  FileType,
  SocketWrapper,
  UserAuthenticationType,
  UserResolvePayload,
  UserResolveType,
  UserRole,
  wrapSocket,
} from "../../shared.js";
import { ClientFunctions } from "../../client/core/connection.js";
import {
  UnlockedUserAuthentication,
  UserAuthenticationManager,
} from "../db/user-authentication.js";
import { UserManager, UserResource } from "../db/user.js";
import { UserSessionManager } from "../db/user-session.js";
import { ServerConnectionManager } from "./connection-manager.js";
import { FileManager, FileResource, UnlockedFileResource } from "../db/file.js";
import { FileContentManager, FileContentResource } from "../db/file-content.js";
import {
  FileSnapshotManager,
  FileSnapshotResource,
} from "../db/file-snapshot.js";
import { FileDataManager } from "../db/file-data.js";
import { FileLogManager, FileLogResource } from "../db/file-log.js";
import { FileMimeManager } from "../db/file-mime.js";
import { FileAccessManager, FileAccessResource } from "../db/file-access.js";

export interface ServerFunctions extends ConnectionFunctions {
  restore: (authentication: Authentication) => Promise<Authentication>;

  authenticate: (
    user: UserResolvePayload,
    type: UserAuthenticationType,
    payload: Uint8Array
  ) => Promise<Authentication | null>;

  getServerStatus: () => Promise<{
    setupRequired: boolean;
  }>;

  register: (
    username: string,
    firstName: string,
    middleName: string | null,
    lastName: string,
    password: string
  ) => Promise<UserResource>;

  getUser: (resolve: UserResolvePayload) => Promise<UserResource>;

  listUsers: (options?: {
    searchString?: string;
    offset?: number;
    limit?: number;
  }) => Promise<UserResource[]>;

  createUser: (
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
    firstName: string,
    middleName: string | null,
    lastName: string,
    role: UserRole
  ) => Promise<UserResource>;

  setSuspend: (id: number, isSuspended: boolean) => Promise<UserResource>;

  createFile: (
    parentFolderId: number,
    name: string,
    content: Uint8Array
  ) => Promise<FileResource>;

  createFolder: (parentFolderId: number, name: string) => Promise<FileResource>;

  scanFolder: (folderId: number | null) => Promise<FileResource[]>;

  setUserAccess: (
    fileId: number,
    targetUserId: number,
    newType?: FileAccessLevel
  ) => Promise<FileAccessLevel>;

  getFile: (fileId: number | null) => Promise<FileResource>;

  getFilePathChain: (fileId: number) => Promise<FileResource[]>;

  getFileSize: (fileId: number) => Promise<number>;

  getFileMime: (fileId: number) => Promise<[mime: string, description: string]>;

  listFileViruses: (fileId: number) => Promise<string[]>;

  listFileAccess: (
    fileId: number,
    offset?: number,
    limit?: number
  ) => Promise<FileAccessResource[]>;

  listFileSnapshots: (
    fileId: number,
    offset?: number,
    limit?: number
  ) => Promise<FileSnapshotResource[]>;

  listFileLogs: (
    targetFileId?: number,
    actorUserId?: number,
    offset?: number,
    limit?: number
  ) => Promise<FileLogResource[]>;

  feedUploadBuffer: (buffer: Uint8Array) => Promise<void>;
  getUploadBufferSize: () => Promise<number>;
  getUploadBufferSizeLimit: () => Promise<number>;
  clearUploadBuffer: () => Promise<number>;

  writeToFile: (
    fileId: number,
    baseFileSnapshotId: number,
    position: number,
    bufferId: number
  ) => Promise<Uint8Array>;

  downloadFile: (
    fileId: number,
    offset?: number,
    limit?: number
  ) => Promise<Uint8Array>;

  moveFile: (fileIds: number, toParentId: number) => Promise<void>;

  copyFile: (fileId: number, destinationId: number) => Promise<void>;

  listSharedFiles: (
    offset?: number,
    limit?: number
  ) => Promise<FileAccessResource[]>;

  listStarredFiles: (
    offset?: number,
    length?: number
  ) => Promise<FileResource[]>;

  isFileStarred: (fileId: number) => Promise<boolean>;

  setFileStar: (fileId: number, starred: boolean) => Promise<boolean>;
}

export interface ServerConnectionContext {
  updateTime: number;
}

export class ServerConnection {
  public constructor(
    manager: ServerConnectionManager,
    id: number,
    socket: Socket,
    {
      onDisconnect,
      getContext,
    }: {
      onDisconnect: () => void;
      getContext: () => ServerConnectionContext;
    }
  ) {
    this.#manager = manager;
    this.#id = id;
    this.#wrapper = wrapSocket((this.#io = socket), this.#server, (func) =>
      this.#onMessage(func)
    );
    this.#getContext = getContext;

    this.#userAuthentication = null;

    this.#io.on("disconnect", onDisconnect);
  }

  readonly #manager: ServerConnectionManager;
  readonly #id: number;
  readonly #io: Socket;
  readonly #wrapper: SocketWrapper<ClientFunctions, ServerFunctions, Socket>;
  readonly #getContext: () => ServerConnectionContext;

  #userAuthentication: UnlockedUserAuthentication | null;

  get context() {
    return this.#getContext();
  }

  get id() {
    return this.#id;
  }

  get currentUserId() {
    return this.#userAuthentication?.userId;
  }

  get #client() {
    return this.#wrapper.funcs;
  }

  #onMessage(func: () => Promise<void>): Promise<void> {
    return this.#manager.server.database.transact(func);
  }

  get #server(): ServerFunctions {
    const server = this.#manager.server;
    const database = this.#manager.server.database;

    const bufferLimit: number = 1024 * 1024 * 512;
    const buffer: Uint8Array[] = [];

    const getUploadBufferSize = (): number =>
      buffer.reduce((size, buffer) => size + buffer.length, 0);

    const [
      userManager,
      userAuthenticationManager,
      userSessionManager,
      fileAccessManager,
      fileManager,
      fileContentManager,
      fileSnapshotManager,
      fileDataManager,
      fileLogManager,
    ] = database.getManagers(
      UserManager,
      UserAuthenticationManager,
      UserSessionManager,
      FileAccessManager,
      FileManager,
      FileContentManager,
      FileSnapshotManager,
      FileDataManager,
      FileLogManager
    );

    const getFile = async (
      id: number | null,
      authentication: UnlockedUserAuthentication,
      accessLevel: FileAccessLevel = FileAccessLevel.None,
      requireType?: FileType
    ) => {
      const file: FileResource | null =
        id != null
          ? await fileManager.getById(id)
          : await fileManager.getRoot(authentication);

      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound, "File not found");
      }

      if (requireType != null && requireType != file.type) {
        ApiError.throw(ApiErrorType.InvalidRequest, "File type invalid");
      }

      try {
        const unlockedFile = await fileManager.unlock(
          file,
          authentication,
          accessLevel
        );

        return unlockedFile;
      } catch {
        ApiError.throw(ApiErrorType.Forbidden, `Failed to unlock file #${id}`);
      }
    };

    const getSnapshot = async (
      file: UnlockedFileResource,
      fileContent: FileContentResource,
      id: number
    ) => {
      const fileSnapshot = await fileSnapshotManager.first({
        where: [
          ["fileId", "=", file.id],
          ["fileContentId", "=", fileContent.id],
          ["id", "=", id],
        ],
      });

      if (fileSnapshot == null) {
        ApiError.throw(ApiErrorType.InvalidRequest, "File snapshot not found");
      }
    };

    const resolveUser = async (
      resolve: UserResolvePayload
    ): Promise<UserResource> => {
      let user: UserResource | null = null;

      if (resolve[0] === UserResolveType.UserId) {
        user = await userManager.getById(resolve[1]);
      } else if (resolve[0] === UserResolveType.Username) {
        user = await userManager.getByUsername(resolve[1]);
      }

      if (user == null) {
        ApiError.throw(ApiErrorType.NotFound, "User not found");
      }

      return user;
    };

    const requireRole = async (
      authentication: UnlockedUserAuthentication,
      role: UserRole
    ) => {
      const user = await userManager.getById(authentication.userId);

      if (user == null) {
        ApiError.throw(ApiErrorType.Unauthorized, "Invalid user");
      }

      if (role > user.role) {
        ApiError.throw(ApiErrorType.Forbidden, "Insufficient role");
      }
    };

    const requireAuthenticated = <T extends boolean>(
      authenticated: T = true as T
    ): T extends true ? UnlockedUserAuthentication : void => {
      if (authenticated) {
        if (this.#userAuthentication == null) {
          ApiError.throw(ApiErrorType.Unauthorized, "Not logged in");
        }

        return this.#userAuthentication as never;
      } else {
        if (this.currentUserId != null) {
          ApiError.throw(ApiErrorType.Conflict, "Already logged in");
        }

        return undefined as never;
      }
    };

    const serverFunctions: ServerFunctions = {
      ...baseConnectionFunctions,

      restore: async (authentication) => {
        requireAuthenticated(false);

        const { userId, userSessionId, userSessionKey } = authentication;

        const userSession = await userSessionManager.getById(userSessionId);
        if (
          userSession != null &&
          userSession.userId === userId &&
          userSession.expireTime > Date.now()
        ) {
          const user = await userManager.getById(userSession.userId);

          if (user != null) {
            if (user.isSuspended) {
              ApiError.throw(
                ApiErrorType.Forbidden,
                `User @${user.username} is currently suspended.`
              );
            }
          }

          try {
            const unlockedSession = userSessionManager.unlock(
              userSession,
              userSessionKey
            );

            const userAuthentication = await userAuthenticationManager.getById(
              unlockedSession.originUserAuthenticationId
            );

            if (userAuthentication != null) {
              return {
                userId: userId,
                userSessionId: unlockedSession.id,
                userSessionKey: unlockedSession.key,
              };
            }
          } catch {
            //
          }
        }

        ApiError.throw(ApiErrorType.Unauthorized, "Invalid login details");
      },

      authenticate: async (resolve, type, payload) => {
        requireAuthenticated(false);

        let user: UserResource | null = null;
        let unlockedUserAuthentication: UnlockedUserAuthentication | null =
          null;

        try {
          user = await resolveUser(resolve);
          unlockedUserAuthentication =
            await userAuthenticationManager.findByPayload(user, type, payload);
        } catch {
          unlockedUserAuthentication = null;
        }

        if (unlockedUserAuthentication == null || user == null) {
          ApiError.throw(ApiErrorType.Unauthorized, "Invalid credentials");
        }

        if (user.isSuspended) {
          ApiError.throw(
            ApiErrorType.Forbidden,
            "User is currently suspended."
          );
        }

        const unlockedSession = await userSessionManager.create(
          unlockedUserAuthentication
        );

        return {
          userId: user.id,
          userSessionId: unlockedSession.id,
          userSessionKey: unlockedSession.key,
        };
      },

      getServerStatus: async () => {
        const setupRequired = await userManager
          .count([["role", ">=", UserRole.SiteAdmin]])
          .then((result) => result === 0);

        return { setupRequired };
      },

      async register(username, firstName, middleName, lastName, password) {
        requireAuthenticated(false);

        const status = await serverFunctions.getServerStatus();
        if (!status.setupRequired) {
          ApiError.throw(
            ApiErrorType.InvalidRequest,
            "Admin user already exists"
          );
        }

        const [user] = await userManager.create(
          username,
          firstName,
          middleName,
          lastName,
          password,
          UserRole.SiteAdmin
        );

        return user;
      },

      async getUser(resolve) {
        requireAuthenticated(true);

        return await this.getUser(resolve);
      },

      listUsers: async ({ searchString: search, offset, limit } = {}) => {
        await requireRole(requireAuthenticated(true), UserRole.Member);

        const users = await userManager.read({
          search,
          offset,
          limit,
        });

        return users;
      },

      createUser: async (username, firstName, middleName, lastName, role) => {
        await requireRole(requireAuthenticated(true), UserRole.SiteAdmin);

        const [users] = database.getManagers(UserManager);
        const [user, unlockedUserKey, password] = await users.create(
          username,
          firstName,
          middleName,
          lastName,
          undefined,
          role
        );

        return [user, unlockedUserKey, password];
      },

      updateUser: async (firstName, middleName, lastName, role) => {
        const { userId } = requireAuthenticated(true);

        const user = await resolveUser([UserResolveType.UserId, userId]);

        if (user.id !== userId) {
          ApiError.throw(ApiErrorType.Forbidden);
        }

        return await userManager.update(user, {
          firstName,
          middleName,
          lastName,
          role,
        });
      },

      setSuspend: async (id, isSuspended) => {
        await requireRole(requireAuthenticated(true), UserRole.SiteAdmin);
        const user = await resolveUser([UserResolveType.UserId, id]);

        return await userManager.setSuspended(user, isSuspended);
      },

      createFile: async (folderId, name, content) => {
        const authentication = requireAuthenticated(true);

        const folder = await getFile(
          folderId,
          authentication,
          FileAccessLevel.ReadWrite
        );

        const file = await fileManager.create(
          authentication,
          folder,
          name,
          FileType.File
        );

        const fileContent = await fileContentManager.getMain(file);
        const fileSnapshot = await fileSnapshotManager.getMain(
          file,
          fileContent
        );

        await fileDataManager.writeData(
          file,
          fileContent,
          fileSnapshot,
          0,
          content
        );

        const user = await resolveUser([
          UserResolveType.UserId,
          authentication.userId,
        ]);
        await fileLogManager.push(folder, user, FileLogType.Modify);
        await fileLogManager.push(file, user, FileLogType.Create);

        return (await fileManager.getById(file.id))!;
      },

      createFolder: async (parentFolderId, name) => {
        const authentication = requireAuthenticated(true);
        const parentFolder = await getFile(
          parentFolderId,
          authentication,
          FileAccessLevel.ReadWrite
        );

        const folder = await fileManager.create(
          authentication,
          parentFolder,
          name,
          FileType.Folder
        );

        const user = (await userManager.getById(authentication.userId))!;
        await fileLogManager.push(parentFolder, user, FileLogType.Modify);
        await fileLogManager.push(folder, user, FileLogType.Create);

        return (await fileManager.getById(folder.id))!;
      },

      scanFolder: async (folderId) => {
        const authentication = requireAuthenticated(true);
        const folder = await getFile(
          folderId,
          authentication,
          FileAccessLevel.Read
        );

        const user = await resolveUser([
          UserResolveType.UserId,
          authentication.id,
        ]);

        await fileLogManager.push(folder, user, FileLogType.Access);
        return await fileManager.scanFolder(folder);
      },

      setUserAccess: async (fileId, targetUserId, level) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(fileId, authentication);
        const granterUser = await resolveUser([
          UserResolveType.UserId,
          authentication.userId,
        ]);
        const user = await resolveUser([UserResolveType.UserId, targetUserId]);
        let accessLevel =
          (await fileAccessManager.first({
            where: [
              ["userId", "=", user.id],
              ["fileId", "=", file.id],
            ],
          })) ?? file.ownerUserId === user.id
            ? FileAccessLevel.Full
            : FileAccessLevel.None;

        if (level != null) {
          if (file.ownerUserId === user.id) {
            ApiError.throw(
              ApiErrorType.InvalidRequest,
              "Owner access level cannot be altered"
            );
          }

          await fileAccessManager.deleteWhere([
            ["fileId", "=", file.id],
            ["userId", "=", user.id],
          ]);

          if (FileAccessLevel[level] == null) {
            ApiError.throw(
              ApiErrorType.InvalidRequest,
              "Invalid file access level"
            );
          }

          if (level === FileAccessLevel.None) {
            accessLevel = (
              await fileAccessManager.create(file, user, level, granterUser)
            ).level;
          }
        }

        return accessLevel;
      },

      getFile: async (fileId: number | null) => {
        const authentication = requireAuthenticated(true);

        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read
        );

        return (await fileManager.getById(file.id))!;
      },

      getFilePathChain: async (fileId: number) => {
        const authentication = requireAuthenticated(true);
        let file = await getFile(fileId, authentication, FileAccessLevel.Read);

        const chain: FileResource[] = [];
        while (file != null) {
          chain.unshift((await fileManager.getById(file.id))!);

          const parentFolderId = file.parentFileId;
          if (parentFolderId == null) {
            break;
          }

          file = await getFile(
            parentFolderId,
            authentication,
            FileAccessLevel.Read
          );
        }

        return chain;
      },

      getFileSize: async (fileId) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read,
          FileType.File
        );

        const fileContent = await fileContentManager.getMain(file);
        const fileSnapshot = await fileSnapshotManager.getMain(
          file,
          fileContent
        );

        return fileSnapshot.size;
      },

      getFileMime: async (fileId) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read,
          FileType.File
        );
        const fileContent = await fileContentManager.getMain(file);
        const fileSnapshot = await fileSnapshotManager.getMain(
          file,
          fileContent
        );

        return await server.mimeDetector.getFileMime(
          file,
          fileContent,
          fileSnapshot
        );
      },

      listFileViruses: async (fileId) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read,
          FileType.File
        );
        const fileContent = await fileContentManager.getMain(file);
        const fileSnapshot = await fileSnapshotManager.getMain(
          file,
          fileContent
        );

        return await server.virusScanner.scan(
          file,
          fileContent,
          fileSnapshot,
          false
        );
      },

      listFileAccess: async (fileId, offset, limit) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read
        );

        let fileAccesses: FileAccessResource[];
        if (file.ownerUserId !== authentication.userId) {
          fileAccesses = await fileAccessManager.read({
            where: [
              ["fileId", "=", file.id],
              ["userId", "=", authentication.userId],
            ],
            orderBy: [["level", true]],
            offset,
            limit,
          });
        } else {
          fileAccesses = await fileAccessManager.read({
            where: [["fileId", "=", file.id]],
            orderBy: [["level", true]],
            offset,
            limit,
          });
        }

        return fileAccesses;
      },

      listFileSnapshots: async (fileId) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.Read,
          FileType.File
        );

        const fileContent = await fileContentManager.getMain(file);
        return await fileSnapshotManager.list(file, fileContent);
      },

      listFileLogs: async (fileId, userId, offset, limit) => {
        const authentication = requireAuthenticated(true);
        const logs: FileLogResource[] = [];

        for await (const log of fileLogManager.readStream({
          where: [
            fileId != null ? ["targetFileId", "=", fileId] : null,
            userId != null ? ["actorUserId", "=", userId] : null,
          ],
          offset,
          limit,
          orderBy: [["id", true]],
        })) {
          try {
            await getFile(
              log.targetFileId,
              authentication,
              FileAccessLevel.Read
            );

            logs.push(log);
          } catch {
            continue;
          }
        }

        return logs;
      },

      writeToFile: async (fileId, baseFileSnapshotId, offset, bufferId) => {
        const authentication = requireAuthenticated(true);
        const file = await getFile(
          fileId,
          authentication,
          FileAccessLevel.ReadWrite,
          FileType.File
        );

        const fileContent = await fileContentManager.getMain(file);
        const fileSnapshot = await getSnapshot(
          file,
          fileContent,
          baseFileSnapshotId
        );
      },

      listSharedFiles: async (offset, limit) => {
        const authentication = requireAuthenticated(true);
        const fileAccesses = await fileAccessManager.read({
          where: [
            ["userId", "=", authentication.userId],
            ["level", ">=", FileAccessLevel.Read],
          ],
          offset,
          limit,
        });

        return fileAccesses;
      },
    };

    return serverFunctions;
  }
}
