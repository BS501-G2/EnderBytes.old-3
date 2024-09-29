import { Knex } from "knex";
import { Database } from "../database.js";
import { ResourceManager } from "../resource.js";
import {
  deserializeFileAccessLevel,
  FileAccessLevel,
  FileAccessResource,
  serializeFileAccessLevel,
  UnlockedFileAccess,
} from "../../shared/db/file-access.js";
import { FileManager } from "./file.js";
import { UserManager } from "./user.js";
import { UserAuthenticationManager } from "./user-authentication.js";
import {
  UnlockedFileResource,
  UnlockedUserAuthentication,
  UserResource,
} from "../../shared.js";

export class FileAccessManager extends ResourceManager<
  FileAccessResource,
  FileAccessManager
> {
  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("userId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("granterUserId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("fileId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");
      table.integer("level").notNullable();
      table.binary("encryptedKey").notNullable();
    }
  }

  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileKey", 1);
  }

  public async create(
    unlockedFile: UnlockedFileResource,
    targetUser: UserResource,
    level: FileAccessLevel,
    granterUser: UserResource
  ): Promise<UnlockedFileAccess> {
    const [userKeys] = this.getManagers(UserAuthenticationManager);
    const userKey = (
      await userKeys.read({
        limit: 1,
        where: [["userId", "=", targetUser.id]],
      })
    )[0]!;

    const fileKey = unlockedFile.aesKey;

    const fileAccess = await this.insert({
      fileId: unlockedFile.id,
      userId: targetUser.id,
      level: serializeFileAccessLevel(level),
      encryptedKey: userKeys.encrypt(userKey, fileKey),
      granterUserId: granterUser.id,
    });

    return {
      ...fileAccess,
      key: fileKey,
    };
  }

  public unlock(
    unlockedUserAuthentication: UnlockedUserAuthentication,
    fileAccess: FileAccessResource
  ): UnlockedFileAccess {
    const [userKeys] = this.getManagers(UserAuthenticationManager);

    const unlockedKey = userKeys.decrypt(
      unlockedUserAuthentication,
      fileAccess.encryptedKey
    );

    return { ...fileAccess, key: unlockedKey };
  }

  public async getAccessLevel(
    file: UnlockedFileResource,
    user: UserResource
  ): Promise<FileAccessLevel> {
    if (file.ownerUserId === user.id) {
      return "Full";
    }

    const fileAccess = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["userId", "=", user.id],
      ],
    });

    return deserializeFileAccessLevel(fileAccess?.level ?? 0);
  }

  public async setUserAccess<T extends FileAccessLevel>(
    file: UnlockedFileResource,
    targetUser: UserResource,
    level: T,
    granterUser: UserResource
  ): Promise<void> {
    if (file.ownerUserId === targetUser.id) {
      return;
    }

    const targetFileAccess = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["userId", "=", targetUser.id],
      ],
    });

    if (targetFileAccess != null) {
      await this.delete(targetFileAccess);
    }

    if (serializeFileAccessLevel(level) > serializeFileAccessLevel("None")) {
      await this.create(file, targetUser, level, granterUser);
    }
  }
}
