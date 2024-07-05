import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";
import NodeClam from "clamscan";
import { Server } from "./server.js";
import { UnlockedFileResource } from "../db/file.js";
import { VirusReportManager } from "../db/virus-report.js";
import { Database } from "../database.js";
import { FileContentManager } from "../db/file-content.js";
import { FileSnapshotManager } from "../db/file-snapshot.js";
import { Readable } from "stream";
import { FileDataManager } from "../db/file-data.js";

export interface VirusScannerInstance {
  clam: NodeClam;
}

export type VirusScannerOptions = [socket: string];

export class VirusScanner extends Service<
  VirusScannerInstance,
  VirusScannerOptions
> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<VirusScannerInstance> = null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<VirusScannerInstance>;

  get #data(): VirusScannerInstance {
    return this.#getData();
  }

  get #database(): Database {
    return this.#server.database;
  }

  get #clam(): NodeClam {
    return this.#data.clam;
  }

  async run(
    setData: ServiceSetDataCallback<VirusScannerInstance>,
    onReady: ServiceReadyCallback,
    socket: string
  ): Promise<void> {
    const clam = new NodeClam();
    await clam.init({
      clamdscan: {
        socket,
      },
      debugMode: false,
    });

    setData({ clam });
    await new Promise<void>(onReady);
  }

  public async scan(
    file: UnlockedFileResource,
    forceScan: boolean = false
  ): Promise<string[]> {
    const [
      virusReportManager,
      fileContentManager,
      fileSnapshotManager,
      fileDataManager,
    ] = this.#database.getManagers(
      VirusReportManager,
      FileContentManager,
      FileSnapshotManager,
      FileDataManager
    );
    const fileContent = await fileContentManager.getMain(file);
    const fileSnapshot = await fileSnapshotManager.getMain(file, fileContent);

    if (!forceScan) {
      const result = await virusReportManager.getScanResult(
        file,
        fileContent,
        fileSnapshot
      );

      if (result != null) {
        return result;
      }

      forceScan = true;
    }

    let position = 0;
    const stream = new Readable({
      read: (size) =>
        void (async () => {
          const buffer = Buffer.from(
            await fileDataManager.readData(
              file,
              fileContent,
              fileSnapshot,
              position,
              size
            )
          );

          stream.push(buffer);

          if (size >= buffer.length) {
            stream.push(null);
          }
          position += buffer.length;
        })(),
    });

    const result = await this.#clam.scanStream(stream);

    stream.destroy();
    await virusReportManager.setScanResult(
      file,
      fileContent,
      fileSnapshot,
      result.viruses
    );
    return result.viruses;
  }
}
