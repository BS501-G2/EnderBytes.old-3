import { Resource } from "../resource.js";
import { FileLogType } from "./file-log.js";

export interface FileResource extends Resource {
  parentFileId: number | null;
  creatorUserId: number;
  ownerUserId: number;

  name: string;
  type: FileType;

  deleted: boolean;

  encryptedAesKey: Uint8Array;
  encryptedAesKeyIv: Uint8Array;
  encryptedAesKeyAuthTag: Uint8Array;
}

export interface UnlockedFileResource extends FileResource {
  aesKey: Uint8Array;
}


export type FileType = "file" | "folder";

export const fileNameLength: readonly [min: number, max: number] =
  Object.freeze([1, 256]);
export const fileNameInvalidCharacters = "\\/:*?'\"<>|";

export const FileNameVerificationFlag = Object.freeze({
  OK: 0,
  InvalidCharacters: 1 << 0,
  InvalidLength: 1 << 1,
  FileExists: 1 << 2,
});

export const fileBufferSize = 1_024 * 64;
export const fileIoSize = 1024 * 1024;
