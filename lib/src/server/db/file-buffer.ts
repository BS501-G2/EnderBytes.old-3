import { Knex } from "knex";
import { ResourceManager } from "../resource.js";
import { Database } from "../database.js";
import { decryptSymmetric, encryptSymmetric, randomBytes } from "../crypto.js";
import {
  FileBufferResource,
  UnlockedFileBufferResource,
} from "../../shared/db/file-buffer.js";
import { UnlockedFileResource } from "../../shared.js";

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
