import { Knex } from "knex";
import { ResourceManager, Resource } from "../resource.js";
import { FileManager, UnlockedFileResource } from "./file.js";
import { FileContentManager, FileContentResource } from "./file-content.js";
import { FileSnapshotManager, FileSnapshotResource } from "./file-snapshot.js";
import { FileBufferManager, FileBufferResource } from "./file-buffer.js";
import { fileBufferSize, FileType } from "../../shared/db/file.js";
import { Database } from "../database.js";
import { Readable } from "stream";

export interface FileDataResource
  extends Resource<FileDataResource, FileDataManager> {
  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;
  fileBufferId: number;
  index: number;
}

export class FileDataManager extends ResourceManager<
  FileDataResource,
  FileDataManager
> {
  public constructor(
    db: Database,
    init: (init: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileData", 1);
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
        .integer("fileSnapshotId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileBufferId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileBufferManager).recordTableName)
        .onDelete("cascade");

      table.integer("index").notNullable();
    }
  }

  async #create(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    buffer: Uint8Array,
    index: number
  ): Promise<FileDataResource> {
    const [fileBuffers] = this.getManagers(FileBufferManager);
    const fileBuffer = await fileBuffers.create(unlockedFile, buffer);

    return this.insert({
      fileId: unlockedFile.id,
      fileContentId: fileContent.id,
      fileSnapshotId: fileSnapshot.id,
      fileBufferId: fileBuffer.id,
      index: index,
    });
  }

  async #update(
    unlockedFile: UnlockedFileResource,
    fileData: FileDataResource,
    buffer: Uint8Array
  ): Promise<void> {
    const [fileBuffers] = this.getManagers(FileBufferManager);

    const oldFileBuffer = await fileBuffers.getById(fileData.fileBufferId);
    const newFileBuffer = await fileBuffers.create(unlockedFile, buffer);

    await this.update(fileData, {
      fileBufferId: newFileBuffer.id,
    });

    if (oldFileBuffer != null) {
      await this.#autoPurgeBuffer(oldFileBuffer);
    }
  }

  async #getByIndex(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    index: number
  ): Promise<FileDataResource | null> {
    return (
      (
        await this.read({
          where: [
            ["fileId", "=", unlockedFile.id],
            ["fileContentId", "=", fileContent.id],
            ["fileSnapshotId", "=", fileSnapshot.id],
            ["index", "=", index],
          ],
        })
      )[0] ?? null
    );
  }

  async #delete(fileData: FileDataResource): Promise<void> {
    const [fileBuffers] = this.getManagers(FileBufferManager);

    const oldFileBuffer = await fileBuffers.getById(fileData.fileBufferId);
    await this.delete(fileData);

    if (oldFileBuffer != null) {
      await this.#autoPurgeBuffer(oldFileBuffer);
    }
  }

  async #autoPurgeBuffer(oldFileBuffer: FileBufferResource): Promise<void> {
    const [fileBuffers] = this.getManagers(FileBufferManager);

    if (
      (await this.count([
        ["fileBufferId", "=", oldFileBuffer.id],
        ["nextDataId", "is", null],
      ])) === 0
    ) {
      await fileBuffers.purge(oldFileBuffer);
    }
  }

  public async writeData(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    position: number,
    newBuffer: Uint8Array
  ) {
    const [fileBuffers] = this.getManagers(FileBufferManager);
    const positionEnd = position + newBuffer.byteLength;

    let written: number = 0;
    for (let index = 0; ; index++) {
      const bufferStart = index * fileBufferSize;
      const bufferEnd = bufferStart + fileBufferSize;

      if (positionEnd <= bufferStart) {
        break;
      } else if (position >= bufferEnd) {
        continue;
      }

      const fileData = await this.#getByIndex(
        unlockedFile,
        fileContent,
        fileSnapshot,
        index
      );
      let buffer: Uint8Array;
      if (fileData == null) {
        buffer = new Uint8Array(fileBufferSize);
      } else {
        const fileBuffer = fileBuffers.unlock(
          unlockedFile,
          (await fileBuffers.getById(fileData.fileBufferId))!
        );
        buffer = fileBuffer.unlockedBuffer;
      }

      const toWrite = Math.min(
        bufferEnd - position,
        Math.min(newBuffer.byteLength - written, fileBufferSize)
      );
      buffer.set(
        newBuffer.subarray(written, written + toWrite),
        (bufferStart - position) % fileBufferSize
      );
      written += toWrite;

      if (fileData == null) {
        await this.#create(
          unlockedFile,
          fileContent,
          fileSnapshot,
          buffer,
          index
        );
      } else {
        await this.#update(unlockedFile, fileData, buffer);
      }
    }

    const [fileContentManager] = this.getManagers(FileSnapshotManager);
    await fileContentManager.setSize(
      unlockedFile,
      fileContent,
      fileSnapshot,
      Math.max(positionEnd, fileSnapshot.size)
    );
  }

  public async copyDataSnapshot(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    sourceFileSnapshot: FileSnapshotResource,
    destinationFileSnapshot: FileSnapshotResource
  ) {
    const size = sourceFileSnapshot.size;

    if (
      (await this.count([
        ["fileSnapshotId", "=", destinationFileSnapshot.id],
      ])) > 0 ||
      destinationFileSnapshot.size > 0
    ) {
      throw new Error("Destination snapshot must be empty.");
    }
  }

  public async readData(
    unlockedFile: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    position: number = 0,
    length: number = fileSnapshot.size
  ): Promise<Uint8Array> {
    if (position >= fileSnapshot.size) {
      throw new Error("Position out of bounds");
    }

    const [fileBuffers] = this.getManagers(FileBufferManager);
    length = Math.min(length, fileSnapshot.size - position);

    if (length <= 0) {
      return new Uint8Array(0);
    }

    const positionEnd = position + length;

    const output: Uint8Array[] = [];
    let read: number = 0;
    for (let index = 0; ; index++) {
      const bufferStart = index * fileBufferSize;
      const bufferEnd = bufferStart + fileBufferSize;

      if (positionEnd <= bufferStart) {
        break;
      } else if (position >= bufferEnd) {
        continue;
      }

      const fileData = await this.#getByIndex(
        unlockedFile,
        fileContent,
        fileSnapshot,
        index
      );
      let buffer: Uint8Array;

      if (fileData == null) {
        buffer = new Uint8Array(fileBufferSize);
      } else {
        const fileBuffer = fileBuffers.unlock(
          unlockedFile,
          (await fileBuffers.getById(fileData.fileBufferId))!
        );
        buffer = fileBuffer.unlockedBuffer;
      }

      const toRead = Math.min(
        bufferEnd - position,
        Math.min(length - read, fileBufferSize)
      );
      output.push(
        buffer.subarray(
          (bufferStart - position) % fileBufferSize,
          ((bufferStart - position) % fileBufferSize) + toRead
        )
      );
      read += toRead;
    }

    return Buffer.concat(output);
  }

  public async readDataStream(
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    offset: number = 0
  ): Promise<Readable> {
    const getCurrentTransaction: () => Knex | null = () =>
      this.transacting ? this.db : null;
    const transaction = getCurrentTransaction();

    let position: number = offset;

    const stream = new Readable({
      autoDestroy: true,

      read: async (size) => {
        const read = async (): Promise<Buffer> => {
          const buffer = await this.readData(
            file,
            fileContent,
            fileSnapshot,
            position,
            size
          );

          position += buffer.length;
          return Buffer.from(buffer);
        };

        const push = (buffer: Buffer) => {
          stream.push(stream);
          if (buffer.length <= size) {
            stream.push(null);
          }
        };

        try {
          if (transaction == null || getCurrentTransaction() !== transaction) {
            push(await this.transact(() => read()));
          } else {
            push(await read());
          }
        } catch (error: unknown) {
          stream.destroy(error as Error);
        }
      },
    });

    return stream;
  }
}
