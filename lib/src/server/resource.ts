import { Knex } from "knex";
import { Resource, ResourceKey } from "../shared/db.js";
import { Database } from "./db.js";
import { LogLevel } from "../shared/service.js";

export abstract class ResourceManager<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> {
  constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void,
    name: string,
    version: number,
    keys: K,
    ftsColumns: K[keyof K][] = []
  ) {
    this.#db = db;
    this.#name = name;

    if (version <= 0) {
      throw new Error("Invalid version");
    }
    this.#version = version;
    this.#keys = keys;
    this.#ftsColumns = ftsColumns;

    init((version) => this.#init(version));
  }

  readonly #db: Database;
  readonly #name: string;
  readonly #version: number;
  readonly #keys: K;
  readonly #ftsColumns: K[keyof K][];

  get #RECORD_TABLE() {
    return `${this.#name}_Record`;
  }

  get #DATA_TABLE() {
    return `${this.#name}_Data`;
  }

  get db() {
    return this.#db.db;
  }

  get name() {
    return this.#name;
  }

  get version() {
    return this.#version;
  }

  async #init(version: number = 0): Promise<void> {
    if (version === 0) {
      await this.logSql(
        LogLevel.Debug,
        this.db.schema.createTable(this.#RECORD_TABLE, (table) => {
          table.increments(ResourceRecordKey.Id);
          table.boolean(ResourceRecordKey.Deleted);
        })
      );

      await this.logSql(
        LogLevel.Debug,
        this.db.schema.createTable(this.#DATA_TABLE, (table) => {
          table.increments(ResourceKey.DataId);
          table.integer(ResourceKey.RecordId).notNullable();
          table.integer(ResourceKey.CreateTime).notNullable();

          table.integer(ResourceKey.PreviousDataId).nullable();
          table.integer(ResourceKey.NextDataId).nullable();
        })
      );
    }

    await this.logSql(
      LogLevel.Debug,
      this.db.schema.alterTable(this.#DATA_TABLE, (table) =>
        this.upgrade(table, version)
      )
    );
  }

  public get keys(): K {
    return this.#keys as K;
  }

  public get ftsColumns(): K[keyof K][] {
    return [...this.#ftsColumns];
  }

  public async create(data: Omit<R, keyof typeof ResourceKey>): Promise<R> {
    const resourceRecord = (
      await this.db
        .table<ResourceRecord, ResourceRecord[]>(this.#RECORD_TABLE)
        .insert({ [ResourceRecordKey.Deleted]: false })
        .returning("*")
    )[0];

    const dataResult = await this.db
      .table<R, R[]>(this.#DATA_TABLE)
      .insert({
        [ResourceKey.RecordId]: resourceRecord[ResourceRecordKey.Id],
        [ResourceKey.CreateTime]: Date.now(),
        [ResourceKey.PreviousDataId]: null,
        [ResourceKey.NextDataId]: null,
        ...data,
      } as never)
      .returning("*");

    return dataResult[0] as R;
  }

  public async update(
    data: R,
    newData: Partial<Omit<R, keyof typeof ResourceKey>>,
    options?: UpdateOptions<R, M, K>
  ): Promise<R> {
    const resourceRecord = await this.db
      .table<ResourceRecord, ResourceRecord[]>(this.#RECORD_TABLE)
      .where(ResourceRecordKey.Id, "=", data[ResourceKey.RecordId as keyof K])
      .first();

    if (resourceRecord == null) {
      throw new Error("Resource not found");
    }

    if (resourceRecord[ResourceRecordKey.Deleted] === true) {
      throw new Error("Resource is deleted");
    }

    const base = await this.db
      .table<R, R[]>(this.#DATA_TABLE)
      .where(
        ResourceKey.DataId,
        "=",
        options?.baseVersionId != null
          ? options.baseVersionId
          : data[ResourceKey.DataId as keyof K]
      )
      .first();

    if (base == null) {
      throw new Error("Base version not found");
    }

    const insertRow: R = {
      ...base,
      ...newData,
      [ResourceKey.RecordId]: resourceRecord[ResourceRecordKey.Id],
      [ResourceKey.CreateTime]: Date.now(),
      [ResourceKey.PreviousDataId]: base[ResourceKey.DataId],
      [ResourceKey.NextDataId]: null,
    };

    delete (insertRow as never)[ResourceKey.DataId];

    const newDataResult: R = (
      await this.db
        .table<R, R[]>(this.#DATA_TABLE)
        .insert(insertRow as never)
        .returning("*")
    )[0] as never;

    await this.db
      .table<R, R[]>(this.#DATA_TABLE)
      .where({
        [ResourceKey.DataId as keyof K]: base[ResourceKey.DataId as keyof K],
      })
      .update({
        [ResourceKey.NextDataId as keyof K]:
          newDataResult[ResourceKey.DataId as keyof K],
      } as never);

    data[ResourceKey.NextDataId as keyof K] =
      newDataResult[ResourceKey.DataId as keyof K];

    return newDataResult;
  }

  public async delete(data: R): Promise<void> {
    await this.db
      .table<ResourceRecord, ResourceRecord[]>(this.#RECORD_TABLE)
      .where(ResourceRecordKey.Id, "=", data[ResourceKey.RecordId as keyof K])
      .update({ [ResourceRecordKey.Deleted]: true });

    await this.db
      .table<R, R[]>(this.#DATA_TABLE)
      .where(ResourceKey.RecordId, "=", data[ResourceKey.RecordId as keyof K])
      .delete();
  }

  public async read(options?: QueryOptions<R, M, K>): Promise<R[]> {
    let offset = options?.offset ?? 0;
    const results: R[] = [];

    while (results.length < (options?.limit ?? Infinity)) {
      let query = this.db.table<R, R[]>(this.#DATA_TABLE).select("*");

      if (options?.where != null) {
        query = options.where.reduce((query, where) => {
          if (where == null) {
            return query;
          }

          const [key, op, value] = where;
          return query.where(`${key as string}`, op, value);
        }, query);
      }

      if (options?.search != null) {
        query = query.whereRaw(
          `(${this.#ftsColumns.join(" || ' ' || ")}) @@ plainto_tsquery('${
            options.search
          }')`
        );
      }

      query = query.where(ResourceKey.NextDataId, "is", null);

      if (options?.orderBy != null) {
        query = options.orderBy.reduce(
          (query, entry) =>
            entry != null
              ? query.orderBy(entry[0], entry[1] ?? false ? "desc" : "asc")
              : query,
          query
        );
      }

      if (options?.limit != null) {
        query = query.limit(options.limit - results.length);
      }

      query = query.offset(offset);

      for (const resource of await query) {
        const resourceRecord = await this.db
          .table<ResourceRecord, ResourceRecord[]>(this.#RECORD_TABLE)
          .select("*")
          .where(
            ResourceRecordKey.Id,
            "=",
            (resource as R)[this.keys.RecordId as keyof K]
          )
          .first();

        if (resourceRecord?.[ResourceRecordKey.Deleted] === false) {
          results.push(resource as R);
        }

        offset++;
      }
    }

    return results;
  }

  protected abstract upgrade(
    table: Knex.AlterTableBuilder,
    version: number
  ): void;

  public logSql<T extends Knex.QueryBuilder | Knex.SchemaBuilder>(
    level: LogLevel,
    query: T
  ): T {
    return this.#db.logSql(level, query);
  }
}

export interface ResourceRecord {
  [ResourceRecordKey.Id]: number;
  [ResourceRecordKey.Deleted]: boolean;
}

export const ResourceRecordKey = Object.freeze({
  Id: "id",
  Deleted: "deleted",
});

export interface UpdateOptions<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> {
  baseVersionId?: number;
}

export interface DeleteOptions<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> {
  where?: WhereClause<R, M, K>[];
}

export interface GetByIdOptions<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> {
  deleted?: boolean;
  versionId?: number;
}

export interface SearchOptions<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> {
  string: string;

  searchColumns: (keyof K)[];
}

export type QueryOptions<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = {
  where?: (WhereClause<R, M, K> | null)[];
  search?: string;

  orderBy?: (OrderByClause<R, M, K> | null)[];

  offset?: number;
  limit?: number;

  deleted?: boolean;
} & (
  | {
      where: (WhereClause<R, M, K> | null)[];
      search: null;
    }
  | {
      where: null;
      search: string;
    }
  | object
);

export type WhereClause<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey,
  T extends keyof K = keyof K
> = [
  T,
  "=" | ">" | ">=" | "<" | "<=" | "<>" | "!=" | "is" | "is not" | "like",
  R[T]
];

export type OrderByClause<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = [key: keyof K, descending?: boolean];
