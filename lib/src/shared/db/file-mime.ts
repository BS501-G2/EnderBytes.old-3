import { Resource } from "../resource.js";

export interface FileMimeResource extends Resource {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;

  mime: string;
  description: string;
}
