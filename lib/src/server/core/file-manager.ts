import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface FileManagerData {}
export type FileManagerOptions = [];

export class FileManager extends Service<FileManagerData, FileManagerOptions> {
  run(
    setData: ServiceSetDataCallback<FileManagerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> | void {
    throw new Error("Method not implemented.");
  }
}
