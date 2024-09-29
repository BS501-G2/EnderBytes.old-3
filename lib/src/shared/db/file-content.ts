import { Resource } from "../resource.js";

export interface FileContentResource extends Resource {
  fileId: number;
  isMain: boolean;
}
