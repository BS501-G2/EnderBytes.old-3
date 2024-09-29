import { Knex } from "knex";
import { QueryOptions, ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import {
  FileNameVerificationFlag,
  FileResource,
  FileType,
  UnlockedFileResource,
  fileNameInvalidCharacters,
  fileNameLength,
} from "../../shared/db/file.js";
import { UserManager } from "./user.js";
import { UserAuthenticationManager } from "./user-authentication.js";
import { FileAccessManager } from "./file-access.js";
import {
  FileAccessLevel,
  serializeFileAccessLevel,
} from "../../shared/db/file-access.js";
import { decryptSymmetric, encryptSymmetric, randomBytes } from "../crypto.js";
import { UnlockedUserAuthentication, UserResource } from "../../shared.js";

export class FileManager extends ResourceManager<FileResource, FileManager> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "File", 1);
  }

  public async getByName(
    folder: FileResource,
    name: string
  ): Promise<FileResource | null> {
    return (
      (await this.first({
        where: [
          ["parentFileId", "=", folder.id],
          ["name", "=", name],
        ],
      })) ?? null
    );
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
      table.string("type").notNullable();

      table.boolean("deleted").notNullable();

      table.binary("encryptedAesKey").notNullable();
      table.binary("encryptedAesKeyIv").notNullable();
      table.binary("encryptedAesKeyAuthTag").notNullable();
    }
  }

  public verifyFileName<
    T extends FileResource | undefined,
    X = T extends FileResource ? Promise<number> : number
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

  public async create<T extends FileType>(
    unlockedUserKey: UnlockedUserAuthentication,
    parent: UnlockedFileResource,
    name: string,
    type: T
  ): Promise<UnlockedFileResource> {
    if (parent == null) {
      throw new Error("Parent is null");
    }

    let fnCount = 1;
    const friendlyName = () => (fnCount === 1 ? name : `${name} (${fnCount})`);
    while (
      (await this.scanFolder(parent)).find(
        (entry) => entry.name.toLowerCase() === friendlyName().toLowerCase()
      ) != null
    ) {
      if (type === "folder") {
        throw Error("Folder already exists.");
      }

      fnCount++;
    }

    if (parent.type !== "folder") {
      throw new Error("Parent is not a folder.");
    }

    const [key, iv] = await Promise.all([randomBytes(32), randomBytes(16)]);
    const unlockedParent = await this.unlock(parent, unlockedUserKey);

    const [authTag, encryptedKey] = encryptSymmetric(
      unlockedParent.aesKey,
      iv,
      key
    );

    const file = await this.insert({
      parentFileId: parent.id,
      creatorUserId: unlockedUserKey.userId,
      ownerUserId: unlockedParent.ownerUserId,

      name: friendlyName(),
      type: type,
      deleted: false,
      encryptedAesKey: encryptedKey,
      encryptedAesKeyIv: iv,
      encryptedAesKeyAuthTag: authTag,
    });

    await this.update(
      parent,
      {},
      {
        baseDataId: parent.dataId,
      }
    );

    return {
      ...file,
      aesKey: key,
    };
  }

  public async getRoot(
    unlockedUserKey: UnlockedUserAuthentication
  ): Promise<FileResource> {
    const root = (
      await this.read({
        where: [
          ["parentFileId", "is", null],
          ["ownerUserId", "=", unlockedUserKey.userId],
        ],
        limit: 1,
      })
    )[0]!;

    if (root != null) {
      return root;
    }

    const key = await randomBytes(32);
    const [userKeys] = this.getManagers(UserAuthenticationManager);
    const encryptedAesKey = userKeys.encrypt(unlockedUserKey, key);

    const newRoot = await this.insert({
      parentFileId: null,
      creatorUserId: unlockedUserKey.userId,
      ownerUserId: unlockedUserKey.userId,
      name: "root",
      type: "folder",

      deleted: false,

      encryptedAesKey: encryptedAesKey,
      encryptedAesKeyIv: new Uint8Array(0),
      encryptedAesKeyAuthTag: new Uint8Array(0),
    });

    return (await this.getById(newRoot.id))!;
  }

  public async unlock(
    file: FileResource,
    unlockedUserAuthentication: UnlockedUserAuthentication,
    accessLevel?: FileAccessLevel
  ): Promise<UnlockedFileResource> {
    const [userKeys] = this.getManagers(UserAuthenticationManager);
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
              ["fileId", "=", file.id],
              ["userId", "=", unlockedUserAuthentication.userId],
              ["level", ">=", serializeFileAccessLevel(accessLevel)],
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

      const key = userKeys.decrypt(
        unlockedUserAuthentication,
        file.encryptedAesKey
      );

      return {
        ...file,
        aesKey: key,
      };
    }
  }

  public async scanFolder(folder: FileResource): Promise<FileResource[]> {
    const files = await this.read({
      where: [
        ["parentFileId", "=", folder.id],
        ["deleted", "=", false],
      ],
      orderBy: [["type", true]],
    });

    return files;
  }

  public async move(
    file: UnlockedFileResource,
    newParent: UnlockedFileResource
  ) {
    const files = await this.scanFolder(newParent);

    if (file.parentFileId == null) {
      throw new Error("Cannot move root folder");
    }

    if (files.find((f) => f.name === file.name)) {
      throw new Error("Destination has conflicting file");
    }

    const checkForParent = async (folder: FileResource) => {
      if (folder.id == file.id) {
        throw new Error("Cannot move a folder into itself");
      } else {
        const parentId = folder.parentFileId;
        if (parentId == null) {
          return;
        }

        const parent = await this.getById(parentId);
        if (parent != null) {
          await checkForParent(parent);
        }
      }
    };

    await checkForParent(newParent);

    const iv = await randomBytes(16);
    const [authTag, encryptedKey] = encryptSymmetric(
      newParent.aesKey,
      iv,
      file.aesKey
    );

    await this.update(file, {
      parentFileId: newParent.id,
      encryptedAesKey: encryptedKey,
      encryptedAesKeyIv: iv,
      encryptedAesKeyAuthTag: authTag,
    });
    await this.update(newParent, {});
  }

  public async trash(file: UnlockedFileResource): Promise<void> {
    await this.update(file, {
      deleted: true,
    });
  }

  public async untrash(
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    newFolder?: UnlockedFileResource
  ): Promise<void> {
    file = await this.unlock(
      await this.update(file, {
        deleted: false,
      }),
      authentication,
      "Manage"
    );

    if (newFolder != null) {
      await this.move(file, newFolder);
    }
  }

  public async listTrashed(
    ownerUser: UserResource,

    options?: Omit<QueryOptions<FileResource, FileManager>, "where">
  ) {
    return await this.read({
      ...options,

      where: [
        ["ownerUserId", "=", ownerUser.id],
        ["deleted", "=", true],
      ],
    });
  }
}
