import { Knex } from "knex";
import { Resource, ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { FileManager, FileResource } from "./file.js";
import { FileSnapshotManager, FileSnapshotResource } from "./file-snapshot.js";
import { ScanFolderSortType, FileThumbnailerStatusType } from "../../shared.js";
import { FileContentManager, FileContentResource } from "./file-content.js";

export interface FileThumbnailResource extends Resource {
  fileId: number;
  fileSnapshotId: number;

  status: FileThumbnailerStatusType;

  fileThumbnailContentId?: number;
}

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
