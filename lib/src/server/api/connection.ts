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
import { FileManager, FileResource } from "../db/file.js";
import { FileContentManager } from "../db/file-content.js";
import { FileSnapshotManager } from "../db/file-snapshot.js";
import { FileDataManager } from "../db/file-data.js";
import { FileLogManager } from "../db/file-log.js";
import { FileMimeManager } from "../db/file-mime.js";

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
    const database = this.#manager.server.database;

    const [
      userManager,
      userAuthenticationManager,
      userSessionManager,
      fileManager,
      fileContentManager,
      fileSnapshotManager,
      fileDataManager,
      fileLogManager,
    ] = database.getManagers(
      UserManager,
      UserAuthenticationManager,
      UserSessionManager,
      FileManager,
      FileContentManager,
      FileSnapshotManager,
      FileDataManager,
      FileLogManager
    );

    const getFile = async (
      id: number,
      authentication: UnlockedUserAuthentication,
      accessLevel: FileAccessLevel = FileAccessLevel.None,
      requireType?: FileType
    ) => {
      const file: FileResource | null = await fileManager.getById(id);

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

    const server: ServerFunctions = {
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

        const status = await server.getServerStatus();
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

      createFolder: async (folderId, name) => {
        const authentication = requireAuthenticated(true);
        // const folder =  await getFile(folderId, )
      },
    };

    return server;
  }
}
