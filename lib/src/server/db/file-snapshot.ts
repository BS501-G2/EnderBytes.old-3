import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { FileManager, UnlockedFileResource } from "./file.js";
import { FileContentManager, FileContentResource } from "./file-content.js";

export interface FileSnapshotResource extends Resource {
  fileId: number;
  fileContentId: number;
  baseFileSnapshotId: number | null;
}

export class FileSnapshotManager extends ResourceManager<
  FileSnapshotResource,
  FileSnapshotManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileSnapshot", 1);
  }

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
        .integer("baseFileSnapshotId")
        .nullable()
        .references("id")
        .inTable(this.name)
        .onDelete("cascade");
    }
  }

  public async create(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    baseFileSnapshot: FileSnapshotResource
  ): Promise<FileSnapshotResource> {
    return this.insert({
      fileId: unlockedFile.id,
      fileContentId: fileContent.id,
      baseFileSnapshotId: baseFileSnapshot.id,
    });
  }

  public async getMain(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource
  ): Promise<FileSnapshotResource> {
    return (
      (
        await this.read({
          where: [
            ["fileId", "=", unlockedFile.id],
            ["fileContentId", "=", fileContent.id],
            ["baseFileSnapshotId", "is", null],
          ],
        })
      )[0] ??
      (await this.insert({
        fileId: unlockedFile.id,
        fileContentId: fileContent.id,
        baseFileSnapshotId: null,
      }))
    );
  }

  public async list(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource
  ): Promise<FileSnapshotResource[]> {
    return await this.read({
      where: [
        ["fileContentId", "=", fileContent.id],
        ["fileId", "=", unlockedFile.id],
      ],
    });
  }
}
