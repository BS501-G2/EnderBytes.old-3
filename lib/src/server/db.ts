import { Resource, ResourceKey } from "../shared/db.js";
import { LogLevel, Service } from "../shared/service.js";
import knex, { Knex } from "knex";
import FS from "fs";
import { TaskQueue, createTaskQueue } from "../shared/task-queue.js";
import { ResourceManager } from "./resource.js";

export type DataManagerConstructor<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = new (db: Database, init: (onInit: () => Promise<void>) => void) => M;

export type DataManagerRegistration<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = {
  init: DataManagerConstructor<R, M, K>;
};

export type DataManagerInstance<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = {
  init: DataManagerConstructor<R, M, K>;
  instance: M;
};

interface VersionTable {
  name: string;
  version: number;
}

interface DatabaseInstance {
  db: Knex;
  currentTransaction: Knex.Transaction | null;
  taskQueue: TaskQueue;
  mangers: DataManagerInstance<never, never, never>[];
}

export class Database extends Service<
  DatabaseInstance,
  [managers: DataManagerConstructor<never, never, never>[]]
> {
  public constructor() {
    let getInstanceData: (() => DatabaseInstance) | null = null;

    super((getter) => {
      getInstanceData = getter;
    });

    this.#databaseFolder = ".db";
    this.#databaseFile = `${this.#databaseFolder}/database.db`;
    this.#getInstanceData = getInstanceData!;

    this.#transactions = new WeakMap();
    this.#nextTransactionId = 0;
  }

  #getInstanceData: null | (() => DatabaseInstance);

  readonly #databaseFolder: string;
  readonly #databaseFile: string;

  get #instanceData(): DatabaseInstance {
    return this.#getInstanceData!();
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

  get #managers(): DataManagerInstance<never, never, never>[] {
    return this.#instanceData.mangers;
  }

  public get transacting(): boolean {
    return this.#currentTransaction != null;
  }

  async run(
    setData: (instance: DatabaseInstance) => void,
    onReady: (onStop: () => void) => void,
    managers: DataManagerConstructor<never, never, never>[]
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
    await db.raw(
      `create table if not exists version (name text primary key, version integer);`
    );

    setData({
      db,
      currentTransaction: null,
      taskQueue: createTaskQueue(),
      mangers: [],
    });

    await this.transact(async () => {
      for (const entry of managers) {
        let init: ((number?: number) => Promise<void>) | null = null;

        const instance: ResourceManager<never, never, never> = new entry(
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

        this.#instanceData.mangers.push(instance as never);
      }
    });

    onReady(() => {});
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

  public getManager<
    R extends Resource<R, M, K>,
    M extends ResourceManager<R, M, K>,
    K extends typeof ResourceKey
  >(init: DataManagerConstructor<R, M, K>): M {
    const entry = this.#managers.find(
      (entry) => entry.init === (init as never)
    );
    if (entry != null) {
      return entry.instance as M;
    }

    const instance = new init(this, () => this.db as never);
    this.#managers.push({ init: init as never, instance: instance as never });
    return instance;
  }

  public getManagers<
    C extends readonly DataManagerConstructor<never, never, never>[]
  >(...init: C): { [K in keyof C]: DataManagerConstructorInstance<C[K]> } {
    return init.map((init) => this.getManager(init)) as {
      [K in keyof C]: DataManagerConstructorInstance<C[K]>;
    };
  }

  public logSql<T extends Knex.QueryBuilder | Knex.SchemaBuilder>(
    level: LogLevel,
    query: T
  ): T {
    console.log(query.toQuery());
    this.log(level, query.toQuery());

    return query;
  }
}

export type DataManagerConstructorInstance<T> =
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  T extends DataManagerConstructor<infer _M, infer D, infer _A> ? D : never;
