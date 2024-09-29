import { Knex } from "knex";
import { Database } from "../database.js";
import { ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { UserManager } from "./user.js";
import { FileStarResource } from "../../shared/db/file-star.js";
import { FileResource, UserResource } from "../../shared.js";

export class FileStarManager extends ResourceManager<
  FileStarResource,
  FileStarManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileStar", 1);
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
        .integer("userId")
        .nullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
    }
  }

  public async setStar(
    user: UserResource,
    file: FileResource,
    starred: boolean
  ) {
    let star = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["userId", "=", user.id],
      ],
    });

    if (starred && star == null) {
      star = await this.insert({ fileId: file.id, userId: user.id });
    } else if (!starred && star != null) {
      await this.delete(star);
      star = null;
    }

    return star;
  }
}
