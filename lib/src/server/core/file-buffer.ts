import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface FileBufferManagerData {
  buffer: Buffer;
}

export class FileBufferManager extends Service<
  FileBufferManagerData,
  [path: string]
> {
  async run(
    setData: ServiceSetDataCallback<FileBufferManagerData>,
    onReady: ServiceReadyCallback,
    path: string
  ): Promise<void> {
    await new Promise<void>(onReady);
  }
}
