import { Service, ServiceGetDataCallback } from "../../shared/service.js";
import { ServerConnectionManager } from "../api/connection-manager.js";
import { Database } from "../database.js";
import { FileAccessManager } from "../db/file-access.js";
import { FileBufferManager } from "../db/file-buffer.js";
import { FileContentManager } from "../db/file-content.js";
import { FileDataManager } from "../db/file-data.js";
import { FileLogManager } from "../db/file-log.js";
import { FileMimeManager } from "../db/file-mime.js";
import { FileSnapshotManager } from "../db/file-snapshot.js";
import { FileStarManager } from "../db/file-star.js";
import { FileManager } from "../db/file.js";
import { UserAuthenticationManager } from "../db/user-authentication.js";
import { UserSessionManager } from "../db/user-session.js";
import { UserManager } from "../db/user.js";
import { VirusReportEntryManager } from "../db/virus-report-entry.js";
import { VirusReportManager } from "../db/virus-report.js";
import { FileManagerService } from "./file-manager.js";
import { MimeDetector } from "./mime-detector.js";
import { Thumbnailer } from "./thumbnailer.js";
import { VirusScanner } from "./virus-scanner.js";

export interface ServerInstanceData {
  database: Database;
  virusScanner: VirusScanner;
  mimeDetector: MimeDetector;
  connectionManager: ServerConnectionManager;
  thumbnailer: Thumbnailer;
  fileManager: FileManagerService;
}

export type ServerOptions = [port: number];

export class Server extends Service<ServerInstanceData, ServerOptions> {
  public constructor() {
    let getData: ServiceGetDataCallback<ServerInstanceData> = null as never;
    super((func) => (getData = func));

    this.#getData = getData;
  }

  #getData: ServiceGetDataCallback<ServerInstanceData>;
  get #data() {
    return this.#getData();
  }

  get database() {
    return this.#data.database;
  }

  get virusScanner() {
    return this.#data.virusScanner;
  }

  get mimeDetector() {
    return this.#data.mimeDetector;
  }

  get thumbnailer() {
    return this.#data.thumbnailer;
  }

  get fileManager() {
    return this.#data.fileManager;
  }

  async run(
    setData: (instance: ServerInstanceData) => void,
    onReady: (onStop: () => void) => void,
    ...[port]: ServerOptions
  ): Promise<void> {
    // const apiServer = new ApiServer(this);
    const connectionManager = new ServerConnectionManager(this);
    const database = new Database(this);
    const virusScanner = new VirusScanner(this);
    const mimeDetector = new MimeDetector(this);
    const thumbnailer = new Thumbnailer(this);
    const fileManager = new FileManagerService(this);

    setData({
      connectionManager,
      database,
      virusScanner,
      mimeDetector,
      thumbnailer,
      fileManager,
    });

    await database.start([
      UserManager,
      UserAuthenticationManager,
      UserSessionManager,
      FileManager,
      FileAccessManager,
      FileContentManager,
      FileSnapshotManager,
      FileBufferManager,
      FileDataManager,
      VirusReportManager,
      VirusReportEntryManager,
      FileMimeManager,
      FileLogManager,
      FileStarManager,
    ]);
    await virusScanner.start("/run/clamav/clamd.ctl");
    await mimeDetector.start();
    await connectionManager.start(port);
    await thumbnailer.start();
    await fileManager.start();
    // await apiServer.start(port);

    await new Promise<void>((resolve) => onReady(resolve));

    // await apiServer.stop();
    await fileManager.stop();
    await thumbnailer.stop();
    await connectionManager.stop();
    await mimeDetector.stop();
    await virusScanner.stop();
    await database.stop();
  }
}
