import { Service, ServiceGetDataCallback } from "../../shared/service.js";
import { ApiServer } from "../api/api.js";
import { Database } from "../database.js";
import { FileAccessManager } from "../db/file-access.js";
import { FileBufferManager } from "../db/file-buffer.js";
import { FileContentManager } from "../db/file-content.js";
import { FileDataManager } from "../db/file-data.js";
import { FileSnapshotManager } from "../db/file-snapshot.js";
import { FileManager } from "../db/file.js";
import { UserAuthenticationManager } from "../db/user-authentication.js";
import { UserSessionManager } from "../db/user-session.js";
import { UserManager } from "../db/user.js";

export interface ServerInstanceData {
  database: Database;
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

  async run(
    setData: (instance: ServerInstanceData) => void,
    onReady: (onStop: () => void) => void,
    ...[port]: ServerOptions
  ): Promise<void> {
    const apiServer = new ApiServer(this);
    const database = new Database(this);

    setData({ database });

    await apiServer.start(port);
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
    ]);

    await new Promise<void>((resolve) => onReady(resolve));
    await apiServer.stop();
    await database.stop();
  }
}
