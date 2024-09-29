import { Resource } from "../resource.js";

export interface FileDataResource extends Resource {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;
  fileBufferId: number;
  index: number;
}
