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
import { FileContentManager, FileContentResource } from "../db/file-content.js";
import {
  FileSnapshotManager,
  FileSnapshotResource,
} from "../db/file-snapshot.js";
import { Readable } from "stream";
import { FileDataManager } from "../db/file-data.js";

export interface VirusScannerData {
  clam: NodeClam;
}

export type VirusScannerOptions = [socket: string];

export class VirusScanner extends Service<
  VirusScannerData,
  VirusScannerOptions
> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<VirusScannerData> = null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<VirusScannerData>;

  get #data(): VirusScannerData {
    return this.#getData();
  }

  get #database(): Database {
    return this.#server.database;
  }

  get #clam(): NodeClam {
    return this.#data.clam;
  }

  async run(
    setData: ServiceSetDataCallback<VirusScannerData>,
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
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    forceScan: boolean = false
  ): Promise<string[]> {
    const [virusReportManager, fileDataManager] = this.#database.getManagers(
      VirusReportManager,
      FileDataManager
    );

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

  public async scanBuffer(buffer: Uint8Array): Promise<string[]> {
    let position = 0;

    const stream = new Readable({
      read: (size) => {
        const read = buffer.subarray(position, position + size);
        stream.push(read);
        position += read.length;

        if (position >= buffer.length) {
          stream.push(null);
        }
      },
    });

    const result = await this.#clam.scanStream(stream);
    stream.destroy();

    return result.viruses;
  }
}
