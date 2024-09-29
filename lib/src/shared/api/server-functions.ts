import {
  Authentication,
  ScanFolderSortType,
  UserResolvePayload,
} from "../api.js";
import { ConnectionFunctions } from "../connection.js";
import { FileAccessLevel, FileAccessResource } from "../db/file-access.js";
import { FileLogResource, FileLogType } from "../db/file-log.js";
import { FileSnapshotResource } from "../db/file-snapshot.js";
import { FileStarResource } from "../db/file-star.js";
import { FileResource } from "../db/file.js";
import {
  UnlockedUserAuthentication,
  UserAuthenticationType,
} from "../db/user-authentication.js";

import { UserResource, UserRole } from "../db/user.js";

export type Mime = [mime: string, description: string]

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
    password: string,
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

  setSuspend: (id: number, isSuspended: boolean) => Promise<void>;

  createFolder: (parentFolderId: number, name: string) => Promise<FileResource>;

  scanFolder: (
    folderId: number | null,
    sort?: [type: ScanFolderSortType, desc: boolean]
  ) => Promise<FileResource[]>;

  setUserAccess: (
    fileId: number,
    targetUserId: number,
    newType?: FileAccessLevel
  ) => Promise<FileAccessLevel>;

  getFile: (fileId: number | null) => Promise<FileResource>;

  adminGetFile: (fileId: number) => Promise<FileResource>;

  adminScanFolder: (
    fileId: number,
    sort?: [type: ScanFolderSortType, desc: boolean]
  ) => Promise<FileResource[]>;

  getFilePathChain: (fileId: number) => Promise<FileResource[]>;

  getFileSize: (fileId: number, fileSnapshotId?: number) => Promise<number>;

  getFileMime: (fileId: number, fileSnapshotId?: number) => Promise<Mime>;

  getFileTime: (
    fileId: number
  ) => Promise<{ createTime: number; modifyTime: number }>;

  listFileViruses: (
    fileId: number,
    fileSnapshotId?: number
  ) => Promise<string[]>;

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
    targetFileId: number,
    actorUserIds?: number[],
    types?: FileLogType[],

    offset?: number,
    limit?: number
  ) => Promise<FileLogResource[]>;

  adminListFileLogs: (
    targetFileIds?: number[],
    actorUserIds?: number[],
    types?: FileLogType[],

    offset?: number,
    limit?: number
  ) => Promise<FileLogResource[]>;

  getMyAccess: (fileId: number) => Promise<{
    level: FileAccessLevel;

    access: FileAccessResource | null;
  }>;

  openNewFile: (parentFolder: number, name: string) => Promise<number>;

  openFile: (fileId: number, snapshotId?: number) => Promise<number>;

  openFileThumbnail: (fileId: number, snapshotId: number) => Promise<number>;

  truncateFile: (fileHandleId: number, length: number) => Promise<void>;

  readFile: (
    fileHandleId: number,
    position: number,
    length: number
  ) => Promise<Uint8Array>;

  writeFile: (
    fileHandleId: number,
    position: number,
    data: Uint8Array
  ) => Promise<void>;

  closeFile: (fileHandleId: number) => Promise<void>;

  moveFile: (fileIds: number[], toParentId: number) => Promise<void>;

  getFileHandleSize: (fileHandleId: number) => Promise<number>;

  copyFile: (
    fileIds: number[],
    toParentId: number,
    fileSnapshotId?: number
  ) => Promise<void>;

  restoreFile: (fileIds: number[], newParentId?: number) => Promise<void>;

  trashFile: (fileIds: number[]) => Promise<void>;

  purgeFile: (fileIds: number[]) => Promise<void>;

  listTrashedFiles: (
    offset?: number,
    limit?: number
  ) => Promise<FileResource[]>;

  listSharedFiles: (
    targetUserId?: number,
    sharerUserIds?: number[],

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
