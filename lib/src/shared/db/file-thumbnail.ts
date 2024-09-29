import { FileThumbnailerStatusType } from "../api.js";
import { Resource } from "../resource.js";

export interface FileThumbnailResource extends Resource {
  fileId: number;
  fileSnapshotId: number;

  status: FileThumbnailerStatusType;

  fileThumbnailContentId?: number;
}
