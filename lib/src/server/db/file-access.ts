import { Knex } from "knex";
import { Database } from "../database.js";
import { ResourceManager, Resource } from "../resource.js";
import { FileAccessLevel } from "../../shared/db/file-access.js";
import { FileManager, UnlockedFileResource } from "./file.js";
import { UserManager, UserResource } from "./user.js";
import {
  UnlockedUserAuthentication,
  UserAuthenticationManager,
} from "./user-authentication.js";

export interface FileAccessResource
  extends Resource<FileAccessResource, FileAccessManager> {
  userId: number;
  fileId: number;
  level: FileAccessLevel;
  encryptedKey: Uint8Array;
  granterUserId: number;
}

export interface UnlockedFileAccess extends FileAccessResource {
  key: Uint8Array;
}

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
      level,
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
      return FileAccessLevel.Full;
    }

    const fileAccess = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["userId", "=", user.id],
      ],
    });

    return fileAccess?.level ?? FileAccessLevel.None;
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

    if (level > FileAccessLevel.None) {
      await this.create(file, targetUser, level, granterUser);
    }
  }
}
