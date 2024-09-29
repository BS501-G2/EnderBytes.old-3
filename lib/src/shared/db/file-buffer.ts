import { Resource } from "../resource.js";

export interface FileBufferResource extends Resource {
  buffer: Uint8Array;
  bufferIv: Uint8Array;
  bufferAuthTag: Uint8Array;
}

export interface UnlockedFileBufferResource extends FileBufferResource {
  unlockedBuffer: Uint8Array;
}
