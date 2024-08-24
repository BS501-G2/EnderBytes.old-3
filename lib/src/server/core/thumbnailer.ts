import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
  FileThumbnailerStatusType,
  ServiceGetDataCallback,
} from "../../shared.js";
import { FileContentManager, FileContentResource } from "../db/file-content.js";
import { FileSnapshotResource } from "../db/file-snapshot.js";
import { FileResource, UnlockedFileResource } from "../db/file.js";
import { Server } from "./server.js";
import { VirusScannerData } from "./virus-scanner.js";

export interface ThumbnailerData {
  pending: ThumbnailerStatus[];

  getThumbnail: (
    file: UnlockedFileResource,
    fileSnapshot: FileSnapshotResource
  ) => Promise<void>;

  getStatus: (
    file: UnlockedFileResource,
    fileSnapshot: FileSnapshotResource
  ) => Promise<void>;
}

export type ThumbnailerStatus = [
  fileId: number,
  fileSnapshotId: number,
  status: FileThumbnailerStatusType,
  promise: Promise<number>
];

export type ThumbnailerOptions = [];

export class Thumbnailer extends Service<ThumbnailerData, ThumbnailerOptions> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<ThumbnailerData> = null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<ThumbnailerData>;

  async run(
    setData: ServiceSetDataCallback<ThumbnailerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const pending: ThumbnailerStatus[] = [];

    const run = async (
      file: UnlockedFileResource,
      fileSnapshot: FileSnapshotResource
    ): Promise<void> =>
      new Promise<void>((resolve, reject) => {
        const run = async () => {
          let content: FileContentResource;

          try {
            const { database } = this.#server;
            const fileContentManager = database.getManager(FileContentManager);
            content = await fileContentManager.getMain(file);

            resolve();
          } catch (error) {
            reject(error);
            return;
          }
        };

        void run().catch(reject);
      });

    setData({
      pending,

      getThumbnail: async (file, fileSnapshot) => {},

      getStatus: async (file, fileSnapshot) => {},
    });

    await new Promise<void>(onReady);
  }
}
