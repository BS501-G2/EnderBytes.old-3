import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { UnlockedFileResource } from "./file.js";
import { decryptSymmetric, encryptSymmetric, randomBytes } from "../crypto.js";

export interface FileBufferResource
  extends Resource<FileBufferResource, FileBufferManager> {
  buffer: Uint8Array;
  bufferIv: Uint8Array;
  bufferAuthTag: Uint8Array;
}

export interface UnlockedFileBufferResource extends FileBufferResource {
  unlockedBuffer: Uint8Array;
}

export class FileBufferManager extends ResourceManager<
  FileBufferResource,
  FileBufferManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "FileBuffer", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table.binary("buffer").notNullable();
      table.binary("bufferIv").notNullable();
      table.binary("bufferAuthTag").notNullable();
    }
  }

  public async create(
    file: UnlockedFileResource,
    buffer: Uint8Array
  ): Promise<FileBufferResource> {
    const iv = await randomBytes(16);
    const [authTag, encryptedBuffer] = encryptSymmetric(
      file.aesKey,
      iv,
      buffer
    );

    return this.insert({
      buffer: encryptedBuffer,
      bufferIv: iv,
      bufferAuthTag: authTag,
    });
  }

  public unlock(
    file: UnlockedFileResource,
    fileBuffer: FileBufferResource
  ): UnlockedFileBufferResource {
    const buffer = decryptSymmetric(
      file.aesKey,
      fileBuffer.bufferIv,
      fileBuffer.buffer,
      fileBuffer.bufferAuthTag
    );

    return {
      ...fileBuffer,
      unlockedBuffer: buffer,
    };
  }
}
