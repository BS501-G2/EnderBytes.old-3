import {
  Authentication,
  ConnectionFunctions,
  FileAccessLevel,
  UserAuthenticationType,
  UserResolvePayload,
  UserRole,
} from "../../shared.js";
import { FileAccessResource } from "../db/file-access.js";
import { FileLogResource } from "../db/file-log.js";
import { FileSnapshotResource } from "../db/file-snapshot.js";
import { FileStarResource } from "../db/file-star.js";
import { FileResource } from "../db/file.js";
import { UnlockedUserAuthentication } from "../db/user-authentication.js";
import { UserResource } from "../db/user.js";

export interface ServerFunctions extends ConnectionFunctions {
  restore: (authentication: Authentication) => Promise<Authentication>;

  whoAmI: () => Promise<UserResource | null>;

  isAuthenticationValid: (authentication: Authentication) => Promise<boolean>;

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

  updateUser: (user: {
    firstName?: string;
    middleName?: string | null;
    lastName?: string;
    role?: UserRole;
  }) => Promise<UserResource>;

  setSuspend: (id: number, isSuspended: boolean) => Promise<UserResource>;

  createFile: (parentFolderId: number, name: string) => Promise<FileResource>;

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

  feedUploadBuffer: (buffer: Uint8Array) => Promise<number>;

  getUploadBufferSize: () => Promise<number>;

  getUploadBufferSizeLimit: () => Promise<number>;

  clearUploadBuffer: () => Promise<void>;

  writeUploadBufferToFile: (
    fileId: number,
    sourceFileSnapshotId: number,
    position: number
  ) => Promise<void>;

  downloadFile: (
    fileId: number,
    position?: number,
    length?: number,
    snapshotId?: number
  ) => Promise<Uint8Array>;

  moveFile: (fileIds: number[], toParentId: number) => Promise<void>;

  copyFile: (fileIds: number[], toParentId: number) => Promise<void>;

  restoreFile: (fileIds: number[], newParentId?: number) => Promise<void>;

  trashFile: (fileIds: number[]) => Promise<void>;

  purgeFile: (fileIds: number[]) => Promise<void>;

  listTrashedFiles: (
    offset?: number,
    limit?: number
  ) => Promise<FileResource[]>;

  listSharedFiles: (
    offset?: number,
    limit?: number
  ) => Promise<FileAccessResource[]>;

  listStarredFiles: (
    fileId?: number,
    userId?: number,

    offset?: number,
    length?: number
  ) => Promise<FileStarResource[]>;

  isFileStarred: (fileId: number) => Promise<boolean>;

  setFileStar: (fileId: number, starred: boolean) => Promise<boolean>;
}
