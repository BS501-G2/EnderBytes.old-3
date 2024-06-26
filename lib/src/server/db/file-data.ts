import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { FileContentManager } from "./file-content.js";
import { FileSnapshotManager } from "./file-snapshot.js";

export interface FileDataResource
  extends Resource<FileDataResource, FileDataManager> {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;
  fileBufferId: number;
  index: number;
}

export class FileDataManager extends ResourceManager<
  FileDataResource,
  FileDataManager
> {
  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("fileId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileManager).name)
        .onDelete("cascade");

      table
        .integer("fileContentId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileContentManager).name)
        .onDelete("cascade");

      table
        .integer("fileSnapshotId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).name)
        .onDelete("cascade");
    }
  }
}
