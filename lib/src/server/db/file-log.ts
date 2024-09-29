import { Knex } from "knex";
import { QueryOptions, ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { FileLogResource, FileLogType } from "../../shared/db/file-log.js";
import { UserManager } from "./user.js";
import { FileManager } from "./file.js";
import { UnlockedFileResource, UserResource } from "../../shared.js";

export class FileLogManager extends ResourceManager<
  FileLogResource,
  FileLogManager
> {
  public constructor(
    db: Database,
    init: (init: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileLog", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("actorUserId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("targetFileId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");

      table.string("type").notNullable();
      table
        .integer("targetUserId")
        .nullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
    }
  }

  public async push(
    unlockedFile: UnlockedFileResource,
    actorUser: UserResource,
    type: FileLogType
  ) {
    return await this.insert({
      targetFileId: unlockedFile.id,
      actorUserId: actorUser.id,
      type,
    });
  }

  public async readStreamBy(
    options: Omit<QueryOptions<FileLogResource, FileLogManager>, "where"> & {
      file?: UnlockedFileResource;
      actorUser?: UserResource;
    }
  ): Promise<FileLogResource[]> {
    return await this.read({
      ...options,
      where: [
        options.file != null ? ["targetFileId", "=", options.file.id] : null,
        options.actorUser != null
          ? ["actorUserId", "=", options.actorUser.id]
          : null,
      ],
    });
  }
}
