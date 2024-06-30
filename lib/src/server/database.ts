import { LogLevel, Service, ServiceGetDataCallback } from "../shared/service.js";
import knex, { Knex } from "knex";
import FS from "fs";
import { TaskQueue, createTaskQueue } from "../shared/task-queue.js";
import { ResourceManager } from "./resource.js";
import { Resource } from "../shared/db.js";
import { Server } from "./core/server.js";

interface VersionTable {
  name: string;
  version: number;
}

interface DatabaseInstance {
  db: Knex;
  currentTransaction: Knex.Transaction | null;
  taskQueue: TaskQueue;
  managers: DatabaseResourceManagerInstance<never, never>[];
}

export type ResourceManagerConstructor<
  R extends Resource<R, M>,
  M extends ResourceManager<R, M>
> = new (
  db: Database,
  init: (onInit: (version?: number) => Promise<void>) => void
) => M;

export type DatabaseResourceManagerInstance<
  R extends Resource<R, M>,
  M extends ResourceManager<R, M>
> = {
  init: ResourceManagerConstructor<R, M>;
  instance: M;
};

export type ExtractInstanceFromConstructor<T> =
  T extends ResourceManagerConstructor<infer _R, infer M> ? M : never;

export class Database extends Service<
  DatabaseInstance,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [managers: ResourceManagerConstructor<any, any>[]]
> {
  public constructor(server: Server) {
    let getInstanceData: ServiceGetDataCallback<DatabaseInstance> = null as never;

    super((func) => {
      getInstanceData = func;
    }, server);

    this.#databaseFolder = ".db";
    this.#databaseFile = `${this.#databaseFolder}/database.db`;

    this.#transactions = new WeakMap();
    this.#nextTransactionId = 0;

    this.#getInstanceData = getInstanceData;
  }

  readonly #databaseFolder: string;
  readonly #databaseFile: string;
  readonly #getInstanceData: () => DatabaseInstance;

  get #instanceData() {
    return this.#getInstanceData();
  }

  get #currentTransaction(): Knex.Transaction | null {
    return this.#instanceData.currentTransaction;
  }

  get #taskQueue(): TaskQueue {
    return this.#instanceData.taskQueue;
  }

  get #db(): Knex {
    return this.#instanceData.db;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get #managers(): DatabaseResourceManagerInstance<any, any>[] {
    return this.#instanceData.managers;
  }

  public get transacting(): boolean {
    return this.#currentTransaction != null;
  }

  async run(
    setData: (instance: DatabaseInstance) => void,
    onReady: (onStop: () => void) => void,
    managers: ResourceManagerConstructor<never, never>[]
  ): Promise<void> {
    if (!FS.existsSync(this.#databaseFolder)) {
      FS.mkdirSync(this.#databaseFolder);
    }

    const db: Knex = knex({
      client: "sqlite3",
      connection: {
        filename: this.#databaseFile,
      },
      useNullAsDefault: true,
    });

    await db.raw("PRAGMA synchtonization = ON;");
    await db.raw("PRAGMA journal_mode = MEMORY;");
    await db.raw("PRAGMA read_uncommitted = true;");
    await db.raw("PRAGMA foreign_keys = ON;");
    await db.raw(
      `create table if not exists version (name text primary key, version integer);`
    );

    setData({
      db,
      currentTransaction: null,
      taskQueue: createTaskQueue(),
      managers: [],
    });

    await this.transact(async () => {
      for (const entry of managers) {
        let init: ((number?: number) => Promise<void>) | null = null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const instance: ResourceManager<any, any> = new entry(
          this,
          (onInit) => {
            init = onInit;
          }
        );

        const version = (await this.#getVersion(instance.name)) ?? 0;
        await (init as unknown as (version?: number) => Promise<void>)?.(
          version
        );

        await this.#setVersion(instance.name, instance.version);

        this.#instanceData.managers.push({
          init: entry,
          instance: instance as never,
        });
      }
    });

    await new Promise<void>((resolve) => onReady(() => resolve()));
  }

  public getManager<R extends Resource<R, M>, M extends ResourceManager<R, M>>(
    init: ResourceManagerConstructor<R, M>
  ) {
    const instance = this.#managers.find((entry) => entry.init === init);

    if (instance == null) {
      throw new Error(`Manager not found: ${init.name}`);
    }

    return instance.instance as M;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public getManagers<R extends ResourceManagerConstructor<any, any>[]>(
    ...constructors: R
  ) {
    return constructors.map((manager) => this.getManager(manager)) as {
      [K in keyof R]: ExtractInstanceFromConstructor<R[K]>;
    };
  }

  public get db(): Knex.Transaction {
    const transaction = this.#currentTransaction;

    if (transaction == null) {
      throw new Error("Must be running inside a transaction callback");
    }

    return transaction;
  }

  async #getVersion(name: string): Promise<number | null> {
    const version = await this.db
      .select<VersionTable>("*")
      .from("version")
      .where("name", "=", name)
      .first();

    return version?.version ?? null;
  }

  async #setVersion(name: string, version: number): Promise<void> {
    const result = await this.db
      .table<VersionTable>("version")
      .update({ version })
      .into("version")
      .where("name", "=", name);

    if (result === 0) {
      await this.db.table<VersionTable>("version").insert({ name, version });
    }
  }

  readonly #transactions: WeakMap<Knex.Transaction, number>;
  #nextTransactionId: number;

  public async transact<T, A extends unknown[] = never[]>(
    callback: (db: Knex.Transaction, ...args: A) => T | Promise<T>,
    ...args: A
  ): Promise<T> {
    this.log(LogLevel.Debug, "Creating transaction queue...");

    const transaction = await this.#taskQueue.pushQueue<T, A>(
      async (...args: A) => {
        if (this.#currentTransaction != null) {
          throw new Error("Transaction has already been started");
        }

        return await this.#db.transaction(async (transaction) => {
          const transactionId = ++this.#nextTransactionId;

          this.log(LogLevel.Debug, `Starting transaction #${transactionId}...`);
          this.#transactions.set(transaction, ++this.#nextTransactionId);
          const instance = this.#instanceData;

          instance.currentTransaction = transaction;
          try {
            return await callback(transaction, ...args);
          } finally {
            instance.currentTransaction = null;
            this.log(LogLevel.Debug, `Transaction #${transactionId} finished.`);
          }
        });
      },
      ...args
    );

    return transaction;
  }

  public logSql<T extends Knex.QueryBuilder | Knex.SchemaBuilder | Knex.Raw>(
    level: LogLevel,
    query: T
  ): T {
    const a = query.toSQL();

    for (const { sql } of (Array.isArray(a) ? a : [a])) {
      if (sql.length === 0) {
        continue;
      }

      this.log(level, sql);
    }

    return query;
  }
}
