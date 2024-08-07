import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface FileIndexerData {}

export class FileIndexer extends Service<FileIndexerData, []> {
  async run(
    setData: ServiceSetDataCallback<FileIndexerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    setData({});

    await new Promise<void>(onReady);
  }
}
