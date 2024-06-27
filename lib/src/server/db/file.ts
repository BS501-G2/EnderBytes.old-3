import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import {
  FileNameVerificationFlag,
  FileType,
  fileNameInvalidCharacters,
  fileNameLength,
} from "../../shared/db/file.js";
import { UserManager } from "./user.js";
import {
  UnlockedUserAuthentication,
  UserAuthenticationManager,
} from "./user-authentication.js";
import { FileAccessManager } from "./file-access.js";
import { FileAccessLevel } from "../../shared/db/file-access.js";
import { decryptSymmetric } from "../crypto.js";

export interface FileResource extends Resource {
  parentFileId: number | null;
  creatorUserId: number;
  ownerUserId: number;

  name: string;
  type: FileType;

  deleted: boolean;

  encryptedAesKey: Uint8Array;
  encryptedAesKeyIv: Uint8Array;
  encryptedAesKeyAuthTag: Uint8Array;
}

export interface UnlockedFileResource extends FileResource {
  aesKey: Uint8Array;
}

export class FileManager extends ResourceManager<FileResource, FileManager> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "File", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("parentFileId")
        .nullable()
        .references("id")
        .inTable(this.recordTableName)
        .onDelete("cascade");

      table
        .integer("creatorUserId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName);

      table
        .integer("ownerUserId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName);

      table.string("name").collate("nocase").notNullable();
      table.integer("type").notNullable();

      table.boolean("deleted").notNullable();

      table.binary("encryptedAesKey").notNullable();
      table.binary("encryptedAesKeyIv").notNullable();
      table.binary("encryptedAesKeyAuthTag").notNullable();
    }
  }

  public verifyFileName<
    T extends FileResource | undefined,
    X = T extends FileResource
    ? Promise<FileNameVerificationFlag>
    : FileNameVerificationFlag
  >(name: string, parentFolder?: T): X {
    let flag = FileNameVerificationFlag.OK;

    const [min, max] = fileNameLength;
    if (name.length < min || name.length > max) {
      flag |= FileNameVerificationFlag.InvalidLength;
    }

    if (name.match(`^[${fileNameInvalidCharacters}]+$`)) {
      flag |= FileNameVerificationFlag.InvalidCharacters;
    }

    return (
      parentFolder == null
        ? flag
        : this.count([
          ["parentFileId", "=", parentFolder.id],
          ["name", "=", name],
        ]).then((existing) =>
          existing > 0 ? FileNameVerificationFlag.FileExists : flag
        )
    ) as X;
  }
  public async unlock(
    file: FileResource,
    unlockedUserAuthentication: UnlockedUserAuthentication,
    accessLevel?: FileAccessLevel
  ): Promise<UnlockedFileResource> {
    const [userAuthenticationManager] = this.getManagers(
      UserAuthenticationManager
    );
    const parentFileid = file.parentFileId;

    if (parentFileid != null) {
      if (file.ownerUserId !== unlockedUserAuthentication.userId) {
        if (accessLevel == null) {
          throw new Error(
            "Access level is required if not the owner of the file."
          );
        }

        const [fileAccesses] = this.getManagers(FileAccessManager);

        const fileAccess = (
          await fileAccesses.read({
            where: [
              ['fileId', "=", file.id],
              ["userId", "=", unlockedUserAuthentication.userId],
              ["level", ">=", accessLevel],
            ],
            orderBy: [["level", true]],
          })
        )[0];

        if (fileAccess != null) {
          const unlockedFileAccess = fileAccesses.unlock(
            unlockedUserAuthentication,
            fileAccess
          );

          return {
            ...file,
            aesKey: unlockedFileAccess.key,
          };
        }
      }

      const parentFile = (await this.getById(parentFileid))!;
      const unlockedParentFile = await this.unlock(
        parentFile,
        unlockedUserAuthentication
      );

      const key = decryptSymmetric(
        unlockedParentFile.aesKey,
        file.encryptedAesKeyIv,
        file.encryptedAesKey,
        file.encryptedAesKeyAuthTag
      );

      return {
        ...file,
        aesKey: key,
      };
    } else {
      if (file.ownerUserId !== unlockedUserAuthentication.userId) {
        throw new Error("User does not have access to the file.");
      }

      const key = userAuthenticationManager.decrypt(
        unlockedUserAuthentication,
        file.encryptedAesKey
      );

      return {
        ...file,
        aesKey: key,
      };
    }
  }
}
