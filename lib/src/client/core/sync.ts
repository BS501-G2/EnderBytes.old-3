import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface SyncData {
  database: IDBDatabase;
}

export type SyncOptions = [];

export class SyncManager extends Service<SyncData, SyncOptions> {
  public constructor() {
    let getData: ServiceGetDataCallback<SyncData> = null as never;

    super((func) => (getData = func));

    this.#getData = getData;
  }

  readonly #getData: ServiceGetDataCallback<SyncData>;
  get #data() {
    return this.#getData();
  }

  get #database() {
    return this.#data.database;
  }

  async run(
    setData: ServiceSetDataCallback<SyncData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const database = await this.#openDatabase();

    setData({ database });

    await new Promise<void>(onReady);

    database.close();
  }

  listEntries(): Promise<FileSystemHandle[]> {
    return new Promise((resolve, reject) => {
      const transaction = this.#database.transaction(
        "file-handles",
        "readwrite"
      );

      const fileHandles = transaction.objectStore("file-handles");
      const request = fileHandles.getAll();

      request.onsuccess = () => {
        console.log(request.result.map((e) => e.a));
      };
      request.onerror = () => reject(new Error(""));
    });
  }

  #openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("file-handles", 1);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onupgradeneeded = ({ oldVersion, newVersion }) => {
        const { result } = request;

        if (oldVersion < 1) {
          const store = result.createObjectStore("file", {
            autoIncrement: true,
            keyPath: "id",
          });

          store.createIndex("file", "file", { unique: true });
        }
      };
    });
  }
}
