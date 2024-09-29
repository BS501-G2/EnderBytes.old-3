import { Resource } from "../resource.js";

export interface FileLogResource extends Resource {
  actorUserId: number;
  targetFileId: number;
  type: FileLogType;
  targetUserId?: number;
}

export type FileLogType =
  | "create"
  | "modify"
  | "access"
  | "delete"
  | "restore"
  | "revert"
  | "grant-access"
  | "revoke-access";
