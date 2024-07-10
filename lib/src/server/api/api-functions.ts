import { ApiError, ApiErrorType, UserResolveType } from "../../shared/api.js";
import { baseConnectionFunctions } from "../../shared/connection.js";
import { FileAccessLevel } from "../../shared/db/file-access.js";
import { FileLogType } from "../../shared/db/file-log.js";
import { FileType } from "../../shared/db/file.js";
import { UserRole } from "../../shared/db/user.js";
import { Server } from "../core/server.js";
import { FileAccessManager, FileAccessResource } from "../db/file-access.js";
import { FileContentManager } from "../db/file-content.js";
import { FileDataManager } from "../db/file-data.js";
import { FileLogManager } from "../db/file-log.js";
import { FileSnapshotManager } from "../db/file-snapshot.js";
import { FileStarManager } from "../db/file-star.js";
import { FileManager, FileResource, UnlockedFileResource } from "../db/file.js";
import {
  UnlockedUserAuthentication,
  UserAuthenticationManager,
} from "../db/user-authentication.js";
import { UserSessionManager } from "../db/user-session.js";
import { UserManager, UserResource } from "../db/user.js";
import { ApiServerFunctions } from "./api.js";

export interface ServerStatus {
  setupRequired: boolean;
}

export interface Authentication {
  userId: number;

  userSessionId: number;
  userSessionKey: Uint8Array;
}

export function getApiFunctions(server: Server): ApiServerFunctions {
  const { database, virusScanner } = server;

  const requireAuthentication = async (
    authentication: Authentication | null
  ): Promise<UnlockedUserAuthentication> => {
    if (authentication == null) {
      ApiError.throw(ApiErrorType.Unauthorized);
    }

    const [users, userAuthentications, userSessions] = database.getManagers(
      UserManager,
      UserAuthenticationManager,
      UserSessionManager
    );
    const { userSessionId, userSessionKey } = authentication;

    const userSession = await userSessions.getById(userSessionId);
    if (userSession == null) {
      ApiError.throw(ApiErrorType.Unauthorized);
    }

    const user = await users.getById(userSession.userId);
    if (user == null) {
      ApiError.throw(ApiErrorType.Unauthorized);
    }

    if (user.isSuspended) {
      ApiError.throw(
        ApiErrorType.Forbidden,
        `User @${user.username} is currently suspended.`
      );
    }

    if (userSession.expireTime < Date.now()) {
      ApiError.throw(ApiErrorType.Unauthorized);
    }

    const unlockedUserSessions = userSessions.unlock(
      userSession,
      userSessionKey
    );

    const userAuthentication = await userAuthentications.getById(
      unlockedUserSessions.originUserAuthenticationId
    );
    if (userAuthentication == null) {
      ApiError.throw(ApiErrorType.Unauthorized);
    }

    return userSessions.unlockKey(unlockedUserSessions, userAuthentication);
  };

  const ensureUserRole = async (
    unlockedUserKey: UnlockedUserAuthentication,
    type: UserRole
  ): Promise<void> => {
    const [users] = database.getManagers(UserManager);
    const user = await users.getById(unlockedUserKey.userId);
    if (user == null) {
      ApiError.throw(ApiErrorType.Forbidden);
    }

    if (user.role < type) {
      ApiError.throw(ApiErrorType.Forbidden);
    }
  };

  const functions: ApiServerFunctions = {
    ...baseConnectionFunctions,

    authenticate: async (username, type, payload) => {
      console.log([username, type, payload]);
      const [users, userSessions, userAuthentications] = database.getManagers(
        UserManager,
        UserSessionManager,
        UserAuthenticationManager
      );

      const user = await users.getByUsername(username);
      if (user == null) {
        ApiError.throw(
          ApiErrorType.InvalidRequest,
          `User ${username} does not exist.`
        );
      }

      if (user.isSuspended) {
        ApiError.throw(
          ApiErrorType.Forbidden,
          `User @${user.username} is currently suspended.`
        );
      }
      const unlockedUserKey = await userAuthentications.findByPayload(
        user,
        type,
        payload
      );
      if (unlockedUserKey == null) {
        ApiError.throw(
          ApiErrorType.InvalidRequest,
          `Invalid authentication payload.`
        );
      }

      const unlockedSession = await userSessions.create(unlockedUserKey);

      console.log(unlockedSession.unlockedKey);
      return {
        userId: user.id,
        userSessionId: unlockedSession.id,
        userSessionKey: unlockedSession.unlockedKey,
      };
    },

    isAuthenticationValid: async (
      authentication: Authentication
    ): Promise<boolean> => {
      try {
        await requireAuthentication(authentication);
        return true;
      } catch (error) {
        console.log(error);
        return false;
      }
    },

    getServerStatus: async () => {
      const users = database.getManager(UserManager);

      return {
        setupRequired:
          (await users.count([["role", ">=", UserRole.SiteAdmin]])) === 0,
      };
    },

    createAdminUser: async (
      username,
      firstName,
      middleName,
      lastName,
      password
    ) => {
      const [users] = database.getManagers(UserManager);

      const status = await functions.getServerStatus();
      if (!status.setupRequired) {
        throw new Error("Admin user already exists");
      }

      const [user] = await users.create(
        username,
        firstName,
        middleName,
        lastName,
        password,
        UserRole.SiteAdmin
      );

      return user;
    },

    getUser: async (authentication, user) => {
      const unlockedUserKey = await requireAuthentication(authentication);

      const [users] = database.getManagers(UserManager);

      if (user[0] === UserResolveType.Username) {
        return await users.getByUsername(user[1]);
      } else if (user[0] === UserResolveType.UserId) {
        return await users.getById(user[1]);
      } else {
        ApiError.throw(
          ApiErrorType.InvalidRequest,
          "Invalid resolve parameters"
        );
      }
    },

    listUsers: async (authentication, options) => {
      await requireAuthentication(authentication);

      const [users] = database.getManagers(UserManager);

      return await users.read(options);
    },
    createUser: async (
      authentication,
      username,
      firstName,
      middleName,
      lastName,
      role
    ) => {
      const unlockUserKey = await requireAuthentication(authentication);
      await ensureUserRole(unlockUserKey, UserRole.SiteAdmin);

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

    updateUser: async (authentication, id, newData) => {
      const unlockedUserKey = await requireAuthentication(authentication);

      const [users] = database.getManagers(UserManager);
      const user = await users.getById(id);
      if (user == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      if (unlockedUserKey.userId !== user.id) {
        ApiError.throw(ApiErrorType.Forbidden);
      }

      const result = await users.update(user, newData);
      return result;
    },

    suspendUser: async (authentication, id) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      await ensureUserRole(unlockedUserKey, UserRole.SiteAdmin);

      const [users] = database.getManagers(UserManager);
      const user = await users.getById(id);
      if (user == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      return await users.suspend(user);
    },

    createFile: async (authentication, parentFolderId, name, content) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [
        files,
        fileContents,
        fileSnapshotManager,
        fileDataManager,
        fileLogManager,
        userManager,
      ] = database.getManagers(
        FileManager,
        FileContentManager,
        FileSnapshotManager,
        FileDataManager,
        FileLogManager,
        UserManager
      );
      const parentFolder = await files.getById(parentFolderId);

      if (parentFolder == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }
      let unlockedParentFolder: UnlockedFileResource & {
        type: FileType.Folder;
      };

      try {
        unlockedParentFolder = (await files.unlock(
          parentFolder,
          unlockedUserKey
        )) as UnlockedFileResource & {
          type: FileType.Folder;
        };
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const unlockedFile = await files.create(
        unlockedUserKey,
        unlockedParentFolder,
        name,
        FileType.File
      );
      const fileContent = await fileContents.getMain(unlockedFile);
      const fileSnapshot = await fileSnapshotManager.getMain(
        unlockedFile,
        fileContent
      );

      await fileDataManager.writeData(
        unlockedFile,
        fileContent,
        fileSnapshot,
        0,
        content
      );

      const user = (await userManager.getById(unlockedUserKey.userId))!;
      await fileLogManager.push(unlockedParentFolder, user, FileLogType.Modify);
      await fileLogManager.push(unlockedFile, user, FileLogType.Create);

      return (await files.getById(unlockedFile.id))!;
    },

    createFolder: async (authentication, parentFolderId, name) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager, userManager, fileLogManager] = database.getManagers(
        FileManager,
        UserManager,
        FileLogManager
      );
      const parentFolder = await fileManager.getById(parentFolderId);

      if (parentFolder == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedParentFolder: UnlockedFileResource;

      try {
        unlockedParentFolder = (await fileManager.unlock(
          parentFolder,
          unlockedUserKey
        )) as UnlockedFileResource;
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const unlockedFolder = await fileManager.create(
        unlockedUserKey,
        unlockedParentFolder,
        name,
        FileType.Folder
      );

      const user = (await userManager.getById(unlockedUserKey.userId))!;
      await fileLogManager.push(unlockedParentFolder, user, FileLogType.Modify);
      await fileLogManager.push(unlockedFolder, user, FileLogType.Create);

      return (await fileManager.getById(unlockedFolder.id))!;
    },

    scanFolder: async (authentication, folderId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [files, userManager, fileLogManager] = database.getManagers(
        FileManager,
        UserManager,
        FileLogManager
      );
      const folder = await files.getById(folderId);

      if (folder == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedFolder: UnlockedFileResource;

      try {
        unlockedFolder = await files.unlock(folder, unlockedUserKey);
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }
      const user = (await userManager.getById(unlockedUserKey.userId))!;

      await fileLogManager.push(unlockedFolder, user, FileLogType.Access);

      return files.scanFolder(unlockedFolder);
    },

    grantAccessToUser: async (authentication, fileId, targetUserId, level) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager, fileAccessManager, userManager, fileLogManager] =
        database.getManagers(
          FileManager,
          FileAccessManager,
          UserManager,
          FileLogManager
        );

      const file = await fileManager.getById(fileId);
      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedFile: UnlockedFileResource;

      try {
        unlockedFile = await fileManager.unlock(
          file,
          unlockedUserKey,
          FileAccessLevel.Manage
        );
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const user = await userManager.getById(targetUserId);
      if (user == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      const a = await fileAccessManager.read({
        where: [
          ["fileId", "=", unlockedFile.id],
          ["userId", "=", user.id],
        ],
        limit: 1,
      });

      if (a.length > 0) {
        await fileAccessManager.update(a[0], {
          level,
        });
        return (await fileAccessManager.getById(a[0].id))!;
      } else {
        const granterUser = (await userManager.getById(
          unlockedUserKey.userId
        ))!;

        const fileAccess = await fileAccessManager.create(
          unlockedFile,
          user,
          level,
          granterUser
        );

        await fileLogManager.push(
          unlockedFile,
          granterUser,
          FileLogType.GrantAccess
        );

        return (await fileAccessManager.getById(fileAccess.id))!;
      }
    },

    revokeAccessFromUser: async (authentication, fileId, targetUserId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager, fileAccessManager, userManager, fileLogManager] =
        database.getManagers(
          FileManager,
          FileAccessManager,
          UserManager,
          FileLogManager
        );

      const file = await fileManager.getById(fileId);
      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedFile: UnlockedFileResource;

      try {
        unlockedFile = await fileManager.unlock(
          file,
          unlockedUserKey,
          FileAccessLevel.Manage
        );
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const user = await userManager.getById(targetUserId);
      if (user == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      const accesses = await fileAccessManager.read({
        where: [
          ["fileId", "=", unlockedFile.id],
          ["userId", "=", user.id],
        ],
      });

      if (accesses.length === 0) {
        return;
      }

      const denierUser = (await userManager.getById(unlockedUserKey.userId))!;

      await fileLogManager.push(
        unlockedFile,
        denierUser,
        FileLogType.RevokeAccess
      );

      await fileAccessManager.delete(accesses[0]);
    },

    listPathChain: async (authentication, fileId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager] = database.getManagers(
        FileManager,
        FileAccessManager
      );

      let file = await fileManager.getById(fileId);
      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      try {
        await fileManager.unlock(file, unlockedUserKey, FileAccessLevel.Manage);
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const files: FileResource[] = [];
      while (file != null) {
        files.unshift(file);

        const parentFolderId = file.parentFileId;
        if (parentFolderId == null) {
          break;
        }

        file = await fileManager.getById(parentFolderId);
      }

      return files;
    },

    listFileAccess: async (authentication, fileId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [files, fileAccessManager] = database.getManagers(
        FileManager,
        FileAccessManager
      );
      const file = await files.getById(fileId);

      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedFile: UnlockedFileResource;
      try {
        unlockedFile = await files.unlock(file, unlockedUserKey);
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      let fileAccesses: FileAccessResource[];

      if (file.ownerUserId !== unlockedUserKey.userId) {
        fileAccesses = await fileAccessManager.read({
          where: [
            ["fileId", "=", unlockedFile.id],
            ["userId", "=", unlockedUserKey.userId],
          ],
          orderBy: [["level", true]],
        });
      } else {
        fileAccesses = await fileAccessManager.read({
          where: [["fileId", "=", unlockedFile.id]],
          orderBy: [["level", true]],
        });
      }

      return fileAccesses;
    },

    listSharedFiles: async (authentication) => {
      const unlockedUserKey = await requireAuthentication(authentication);

      const [fileAccessManager] = database.getManagers(FileAccessManager);
      const fileAccesses = await fileAccessManager.read({
        where: [
          ["userId", "=", unlockedUserKey.userId],
          ["level", ">=", FileAccessLevel.Read],
        ],
      });

      return fileAccesses;
    },

    getFile: async (authentication, fileId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [files] = database.getManagers(FileManager);
      const file =
        fileId != null
          ? await files.getById(fileId)
          : await files.getRoot(unlockedUserKey);
      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      try {
        await files.unlock(file, unlockedUserKey, FileAccessLevel.Read);
        return file;
      } catch {
        ApiError.throw(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }
    },

    listFileSnapshots: async (authentication, fileId) => {
      const file = await functions.getFile(authentication, fileId);
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileSnapshotManager, fileManager, fileContentManager] =
        database.getManagers(
          FileSnapshotManager,
          FileManager,
          FileContentManager
        );

      const unlockedFile = await fileManager.unlock(file, unlockedUserKey);
      const mainFilecontent = await fileContentManager.getMain(unlockedFile);

      return await fileSnapshotManager.list(unlockedFile, mainFilecontent);
    },

    readFile: async (authentication, fileId, offset = 0, length) => {
      const file = await functions.getFile(authentication, fileId);
      const unlockedUserKey = await requireAuthentication(authentication);
      const [
        fileDataManager,
        fileManager,
        fileContentManager,
        fileSnapshotManager,
        fileLogManager,
        userManager,
      ] = database.getManagers(
        FileDataManager,
        FileManager,
        FileContentManager,
        FileSnapshotManager,
        FileLogManager,
        UserManager
      );

      const unlockedFile = await fileManager.unlock(file, unlockedUserKey);
      const mainFilecontent = await fileContentManager.getMain(unlockedFile);
      const fileSnapshot = await fileSnapshotManager.getMain(
        unlockedFile,
        mainFilecontent
      );

      const actorUser = (await userManager.getById(unlockedUserKey.userId))!;
      await fileLogManager.push(unlockedFile, actorUser, FileLogType.Access);

      return fileDataManager.readData(
        unlockedFile,
        mainFilecontent,
        fileSnapshot,
        offset ?? undefined,
        length ?? undefined
      );
    },

    moveFile: async (authentication, fileIds, newParentFolderId) => {
      const unlockedUserKey = await requireAuthentication(authentication);

      const [fileManager, userManager, fileLogManager] = database.getManagers(
        FileManager,
        UserManager,
        FileLogManager
      );
      const actorUser = (await userManager.getById(unlockedUserKey.userId))!;
      const files = await Promise.all(
        fileIds.map(async (fileId) => {
          const file = await fileManager.getById(fileId);

          if (file == null) {
            ApiError.throw(ApiErrorType.NotFound);
          }

          return file!;
        })
      );

      let unlockedFiles: UnlockedFileResource[];
      try {
        unlockedFiles = await Promise.all(
          files.map((file) => fileManager.unlock(file, unlockedUserKey))
        );
      } catch {
        throw new ApiError(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      for (const unlockedFile of unlockedFiles) {
        const newParentFolder = await fileManager.getById(newParentFolderId);
        if (newParentFolder == null) {
          ApiError.throw(ApiErrorType.NotFound);
        }

        let unlockedNewParentFolder: UnlockedFileResource;
        try {
          unlockedNewParentFolder = await fileManager.unlock(
            newParentFolder,
            unlockedUserKey,
            FileAccessLevel.Manage
          );
        } catch {
          throw new ApiError(
            ApiErrorType.Forbidden,
            "Failed to unlock new parent folder."
          );
        }

        if (unlockedFile.ownerUserId !== unlockedNewParentFolder.ownerUserId) {
          throw new ApiError(
            ApiErrorType.InvalidRequest,
            "Cannot move files between users."
          );
        }

        await fileLogManager.push(
          unlockedNewParentFolder,
          actorUser,
          FileLogType.Modify
        );
        await fileLogManager.push(unlockedFile, actorUser, FileLogType.Modify);

        await fileManager.move(unlockedFile, unlockedNewParentFolder);
      }
    },
    getFileMimeType: async (authentication, fileId) => {
      const unlockedUserKey = await requireAuthentication(authentication);

      const [fileManager, fileContentManager, fileSnapshotManager] =
        database.getManagers(
          FileManager,
          FileContentManager,
          FileSnapshotManager
        );
      const file = await fileManager.getById(fileId);
      if (file == null) {
        ApiError.throw(ApiErrorType.NotFound);
      }

      let unlockedFile: UnlockedFileResource;
      try {
        unlockedFile = await fileManager.unlock(
          file,
          unlockedUserKey,
          FileAccessLevel.Manage
        );
      } catch {
        throw new ApiError(
          ApiErrorType.Forbidden,
          "Failed to unlock parent folder."
        );
      }

      const mainFilecontent = await fileContentManager.getMain(unlockedFile);
      const fileSnapshot = await fileSnapshotManager.getMain(
        unlockedFile,
        mainFilecontent
      );

      return server.mimeDetector.getFileMime(
        unlockedFile,
        mainFilecontent,
        fileSnapshot
      );
    },

    copyFile: async (authentication, fileId, destinationId) => {},

    searchUser: async (authentication, searchString) => {
      await requireAuthentication(authentication);

      const [userManager] = database.getManagers(UserManager);
      const result = await userManager.read({
        search: searchString,
      });

      return result;
    },

    getFileSize: async (authentication, fileId) => {
      const file = await functions.getFile(authentication, fileId);
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager, fileContentManager] = database.getManagers(
        FileManager,
        FileContentManager
      );

      const unlockedFile = await fileManager.unlock(file, unlockedUserKey);
      const mainFileContent = await fileContentManager.getMain(unlockedFile);

      return mainFileContent.size;
    },

    scanFile: async (authentication, fileId) => {
      const file = await functions.getFile(authentication, fileId);
      if (file.type !== FileType.File) {
        ApiError.throw(ApiErrorType.InvalidRequest, "Not a type of file");
      }

      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager] = database.getManagers(FileManager);

      const unlockedFile = await fileManager.unlock(file, unlockedUserKey);

      return await virusScanner.scan(unlockedFile);
    },

    listFileLogs: async (authentication, targetFileId, actorUserId) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileManager, userManager, fileLogManager] = database.getManagers(
        FileManager,
        UserManager,
        FileLogManager
      );

      let unlockedTargetFile: UnlockedFileResource | null = null;
      if (targetFileId != null) {
        const targetFile = await fileManager.getById(targetFileId);

        if (targetFile == null) {
          ApiError.throw(ApiErrorType.NotFound, "File not found");
        }

        try {
          unlockedTargetFile = await fileManager.unlock(
            targetFile,
            unlockedUserKey,
            FileAccessLevel.Read
          );
        } catch {
          ApiError.throw(ApiErrorType.Forbidden, "Failed to unlock file");
        }
      }

      let actorUser: UserResource | null = null;
      if (actorUserId != null) {
        actorUser = await userManager.getById(actorUserId);

        if (actorUser == null) {
          ApiError.throw(ApiErrorType.NotFound, "User not found");
        }
      }

      return await fileLogManager.readStreamBy({
        file: unlockedTargetFile ?? undefined,
        actorUser: actorUser ?? undefined,
      });
    },

    listStarred: async (authentication, offset) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const [fileStarManager, fileManager] = database.getManagers(
        FileStarManager,
        FileManager
      );

      return await Promise.all(
        (
          await fileStarManager.read({
            where: [["userId", "=", unlockedUserKey.userId]],
            offset,
            limit: 100,
          })
        ).map(async (star) => (await fileManager.getById(star.fileId))!)
      );
    },

    isStarred: async (
      authentication: Authentication | null,
      fileId: number
    ) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const user = await getCurrentUser(unlockedUserKey);

      const [fileStarManager] = database.getManagers(FileStarManager);

      return (
        (await fileStarManager.first({
          where: [
            ["userId", "=", user.id],
            ["fileId", "=", fileId],
          ],
        })) != null
      );
    },

    setStar: async (authentication, fileId, starred) => {
      const unlockedUserKey = await requireAuthentication(authentication);
      const file = await unlockFile(
        unlockedUserKey,
        await functions.getFile(authentication, fileId)
      );

      const [fileStarManager] = database.getManagers(FileStarManager);

      await fileStarManager.setStar(
        await getCurrentUser(unlockedUserKey),
        file,
        starred
      );
    },
  };

  const getCurrentUser = async (
    unlockedUserKey: UnlockedUserAuthentication
  ) => {
    return (await database
      .getManager(UserManager)
      .getById(unlockedUserKey.userId))!;
  };

  const unlockFile = (
    unlockedUserKey: UnlockedUserAuthentication,
    file: FileResource
  ) => {
    try {
      return database.getManager(FileManager).unlock(file, unlockedUserKey);
    } catch {
      ApiError.throw(ApiErrorType.Forbidden, "Failed to unlock file");
    }
  };

  return functions;
}
