import { Knex } from "knex";
import {  ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { FileContentManager } from "./file-content.js";
import { FileSnapshotManager } from "./file-snapshot.js";
import { Database } from "../database.js";
import { FileMimeResource } from "../../shared/db/file-mime.js";
import { FileContentResource } from "../../shared/db/file-content.js";
import { UnlockedFileResource } from "../../shared.js";
import { FileSnapshotResource } from "../../shared/db/file-snapshot.js";
import { Mime } from "../../shared/api/server-functions.js";

export class FileMimeManager extends ResourceManager<
  FileMimeResource,
  FileMimeManager
> {
  public constructor(
    db: Database,
    init: (init: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileMime", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("fileId")
        .references("id")
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("fileContentId")
        .references("id")
        .inTable(this.getManager(FileContentManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("fileSnapshotId")
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).recordTableName)
        .onDelete("cascade");

      table.string("mime").notNullable();
      table.string("description").notNullable();
    }
  }

  public async setMime(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,

    mime: string,
    description: string
  ): Promise<Mime> {
    let fileMime = await this.first({
      where: [
        ["fileId", "=", unlockedFile.id],
        ["fileContentId", "=", fileContent.id],
        ["fileSnapshotId", "=", fileSnapshot.id],
      ],
    });

    fileMime =
      fileMime === null
        ? await this.insert({
            fileId: unlockedFile.id,
            fileContentId: fileContent.id,
            fileSnapshotId: fileSnapshot.id,

            mime,
            description,
          })
        : await this.update(fileMime, { mime, description });

    return [fileMime.mime, fileMime.description];
  }

  public async getMime(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource
  ): Promise<Mime | null> {
    const fileMime = await this.first({
      where: [
        ["fileId", "=", unlockedFile.id],
        ["fileContentId", "=", fileContent.id],
        ["fileSnapshotId", "=", fileSnapshot.id],
      ],
    });

    return fileMime != null ? [fileMime.mime, fileMime.description] : null;
  }
}
