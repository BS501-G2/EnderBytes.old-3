import { Knex } from "knex";
import { ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { FileContentManager } from "./file-content.js";
import { FileSnapshotManager } from "./file-snapshot.js";
import { Database } from "../database.js";
import { FileContentResource } from "../../shared/db/file-content.js";
import { FileIndexResource } from "../../shared/db/file-index.js";
import { FileSnapshotResource } from "../../shared/db/file-snapshot.js";
import { FileResource } from "../../shared.js";

export class FileIndexManager extends ResourceManager<
  FileIndexResource,
  FileIndexManager
> {
  public constructor(
    db: Database,
    init: (init: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileIndex", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("fileId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileContentId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileContentManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileSnapshotId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).recordTableName)
        .onDelete("cascade");

      table.string("token").notNullable();
    }
  }

  public async pushToken(
    file: FileResource,
    fileContent: FileContentResource,
    fileSnapshotResource: FileSnapshotResource,
    token: string
  ) {
    await this.insert({
      fileId: file.id,
      fileContentId: fileContent.id,
      fileSnapshotId: fileSnapshotResource.id,
      token,
    });
  }

  public async searchByToken(token: string) {
    for (const a of await this.read({
      where: [["token", "like", `%${token}%`]],
    })) {
      const file = (await this.getManager(FileManager).getById(a.fileId))!;
      const fileContent = (await this.getManager(FileContentManager).getById(
        a.fileContentId
      ))!;

      return a;
    }
  }
}
