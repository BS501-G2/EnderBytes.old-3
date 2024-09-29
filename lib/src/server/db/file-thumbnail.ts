import { Knex } from "knex";
import { ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { FileManager } from "./file.js";
import { FileSnapshotManager } from "./file-snapshot.js";
import { FileThumbnailerStatusType, FileResource } from "../../shared.js";
import { FileContentManager } from "./file-content.js";
import { FileThumbnailResource } from "../../shared/db/file-thumbnail.js";
import { FileSnapshotResource } from "../../shared/db/file-snapshot.js";
import { FileContentResource } from "../../shared/db/file-content.js";

export class FileThumbnailManager extends ResourceManager<
  FileThumbnailResource,
  FileThumbnailManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileThumbnail", 1);
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
        .integer("fileSnapshotId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileThumbnailContentId")
        .nullable()
        .references("id")
        .inTable(this.getManager(FileContentManager).recordTableName)
        .onDelete("cascade");

      table.string("status").notNullable();
    }
  }

  public async getByFile(
    file: FileResource,
    fileSnapshot: FileSnapshotResource
  ) {
    return await this.first({
      where: [
        ["fileId", "=", file.id],
        ["fileSnapshotId", "=", fileSnapshot.id],
      ],
    });
  }

  public async create(
    file: FileResource,
    fileSnapshot: FileSnapshotResource,

    status: FileThumbnailerStatusType,
    fileThumbnail?: FileContentResource
  ): Promise<FileThumbnailResource> {
    const thumbnail = await this.insert({
      fileId: file.id,
      fileSnapshotId: fileSnapshot.id,

      status,

      fileThumbnailContentId: fileThumbnail?.id,
    });

    return thumbnail;
  }
}
