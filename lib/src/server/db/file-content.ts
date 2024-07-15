import { Knex } from "knex";
import { Database } from "../database.js";
import { ResourceManager, Resource } from "../resource.js";
import { FileManager, UnlockedFileResource } from "./file.js";
import { FileType } from "../../shared/db/file.js";

export interface FileContentResource
  extends Resource<FileContentResource, FileContentManager> {
  fileId: number;
  isMain: boolean;
}

export class FileContentManager extends ResourceManager<
  FileContentResource,
  FileContentManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileContent", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("fileId")
        .notNullable()
        .references("id")

        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");

      table.boolean("isMain").notNullable();
    }
  }
  public async create(
    unlockedFile: UnlockedFileResource
  ): Promise<FileContentResource> {
    return this.insert({
      fileId: unlockedFile.id,
      isMain: false,
    });
  }

  public async getMain(unlockedFile: UnlockedFileResource) {
    if (unlockedFile.type === FileType.Folder) {
      throw new Error("File is a folder.");
    }

    return (
      (
        await this.read({
          where: [
            ["fileId", "=", unlockedFile.id],
            ["isMain", "=", true],
          ],
        })
      )[0] ??
      (await this.insert({
        fileId: unlockedFile.id,
        isMain: true,
      }))
    );
  }
}
