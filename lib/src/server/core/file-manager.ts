import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface FileManagerData {}

export class FileManager extends Service<FileManagerData, []> {
  run(
    setData: ServiceSetDataCallback<FileManagerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> | void {

  }
}
