import { Resource } from "../resource.js";

export type FileAccessLevel = "None" | "Read" | "ReadWrite" | "Manage" | "Full";

export interface FileAccessResource extends Resource {
  userId: number;
  fileId: number;
  level: number;
  encryptedKey: Uint8Array;
  granterUserId: number;
}

export interface UnlockedFileAccess extends FileAccessResource {
  key: Uint8Array;
}

const fileAccessLevelConversionOrder: FileAccessLevel[] = [
  "None",
  "Read",
  "ReadWrite",
  "Manage",
  "Full",
];

export function serializeFileAccessLevel(level: FileAccessLevel): number {
  const index = fileAccessLevelConversionOrder.indexOf(level);

  if (index < 0) {
    throw new Error(`Invalid file access level: ${level}`);
  }

  return index;
}

export function deserializeFileAccessLevel(level: number): FileAccessLevel {
  if (level < 0 || level >= fileAccessLevelConversionOrder.length) {
    throw new Error(`Invalid file access level: ${level}`);
  }

  return fileAccessLevelConversionOrder[level];
}
