import { Knex } from "knex";
import { Database } from "../database.js";
import { ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { FileResource, FileType } from "../../shared/db/file.js";
import { FileContentResource } from "../../shared/db/file-content.js";

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
  public async create(file: FileResource): Promise<FileContentResource> {
    return this.insert({
      fileId: file.id,
      isMain: false,
    });
  }

  public async getMain(file: FileResource) {
    if (file.type === "folder") {
      throw new Error("File is a folder.");
    }

    return (
      (
        await this.read({
          where: [
            ["fileId", "=", file.id],
            ["isMain", "=", true],
          ],
        })
      )[0] ??
      (await this.insert({
        fileId: file.id,
        isMain: true,
      }))
    );
  }
}
