import { Resource } from "../resource.js";

export interface FileIndexResource extends Resource {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;

  token: string;
}
