import { Knex } from "knex";
import { Resource, ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { FileManager, FileResource, UnlockedFileResource } from "./file.js";
import { FileContentManager, FileContentResource } from "./file-content.js";
import { UserManager, UserResource } from "./user.js";
import { UnlockedUserAuthentication } from "./user-authentication.js";
import { FileDataManager } from "./file-data.js";

export interface FileSnapshotResource extends Resource {
  fileId: number;
  fileContentId: number;
  baseFileSnapshotId: number | null;

  creatorUserId: number;

  size: number;
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
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileContentId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileContentManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("baseFileSnapshotId")
        .nullable()
        .references("id")
        .inTable(this.recordTableName)
        .onDelete("cascade");

      table
        .integer("creatorUserId")
        .nullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");

      table.integer("size").notNullable();
    }
  }

  public async create(
    file: FileResource,
    fileContent: FileContentResource,
    baseFileSnapshot: FileSnapshotResource,
    authorUser: UserResource
  ): Promise<FileSnapshotResource> {
    return this.insert({
      fileId: file.id,
      fileContentId: fileContent.id,
      baseFileSnapshotId: baseFileSnapshot.id,
      creatorUserId: authorUser.id,
      size: 0,
    });
  }

  public async getRoot(
    file: FileResource,
    fileContent: FileContentResource
  ): Promise<FileSnapshotResource> {
    return (
      (
        await this.read({
          where: [
            ["fileId", "=", file.id],
            ["fileContentId", "=", fileContent.id],
            ["baseFileSnapshotId", "is", null],
          ],
        })
      )[0] ??
      (await this.insert({
        fileId: file.id,
        fileContentId: fileContent.id,
        baseFileSnapshotId: null,
        creatorUserId: file.creatorUserId,
        size: 0,
      }))
    );
  }

  public async getByFileAndId(
    file: FileResource,
    fileContent: FileContentResource,
    snapshotId: number
  ) {
    return await this.first({
      where: [
        ["fileId", "=", file.id],
        ["fileContentId", "=", fileContent.id],
        ["id", "=", snapshotId],
      ],
    });
  }

  public async getLatest(
    file: FileResource,
    fileContent: FileContentResource
  ): Promise<FileSnapshotResource> {
    return (
      (await this.getLeaves(file, fileContent)).reduce(
        (latestSnapshot, snapshot) =>
          (latestSnapshot?.id ?? 0) < snapshot.id ? snapshot : latestSnapshot,
        null as FileSnapshotResource | null
      ) ?? (await this.getRoot(file, fileContent))
    );
  }

  public async getLeaves(
    file: FileResource,
    fileContent: FileContentResource
  ): Promise<FileSnapshotResource[]> {
    const snapshots: FileSnapshotResource[] = [];

    for await (const snapshot of this.readStream({
      where: [
        ["fileId", "=", file.id],
        ["fileContentId", "=", fileContent.id],
      ],
    })) {
      const baseSnapshotIndex = snapshots.findIndex(
        (baseSnapshot) => baseSnapshot.id === snapshot.baseFileSnapshotId
      );

      snapshots.push(snapshot);
      if (baseSnapshotIndex >= 0) {
        snapshots.splice(baseSnapshotIndex, 1);
      }
    }

    return snapshots;
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

  public async setSize(
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    size: number
  ): Promise<number> {
    await this.updateWhere({ size }, [
      ["fileId", "=", file.id],
      ["fileContentId", "=", fileContent.id],
      ["id", "=", fileSnapshot.id],
    ]);

    return size;
  }

  public async fork(
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    baseFileSnapshot: FileSnapshotResource,
    creatorUser: UserResource
  ) {
    const newFileSnapshot = await this.insert({
      fileId: file.id,
      fileContentId: fileContent.id,
      baseFileSnapshotId: baseFileSnapshot.id,
      creatorUserId: creatorUser.id,
      size: baseFileSnapshot.size,
    });

    const [fileDataManager] = this.getManagers(FileDataManager);

    await fileDataManager.copySnapshotData(
      file,
      fileContent,
      baseFileSnapshot,
      newFileSnapshot
    );

    return newFileSnapshot;
  }
}
