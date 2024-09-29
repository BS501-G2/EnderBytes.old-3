import { Resource } from "../resource.js";

export interface FileStarResource extends Resource {
  userId: number;
  fileId: number;
}
