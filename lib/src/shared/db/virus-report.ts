import { Resource } from "../resource.js";

export interface VirusReportResource extends Resource {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;
}
