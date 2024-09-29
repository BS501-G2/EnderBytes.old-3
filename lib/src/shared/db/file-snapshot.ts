import { Resource } from "../resource.js";

export interface FileSnapshotResource extends Resource {
  fileId: number;
  fileContentId: number;
  baseFileSnapshotId: number | null;

  creatorUserId: number;

  size: number;
}
