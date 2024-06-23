import type { Knex } from 'knex';
import { DataManager, type Data } from '../db';
import { FileManager, type UnlockedFile } from './file';
import { FileSnapshotManager, type FileSnapshot } from './file-snapshot';
import { FileContentManager } from './file-content';

export interface FileThumbnail extends Data<FileThumbnailManager, FileThumbnail> {
  [FileThumbnailManager.KEY_FILE_ID]: number;
  [FileThumbnailManager.KEY_FILE_SNAPSHOT_ID]: number;
  [FileThumbnailManager.KEY_TARGET_FILE_CONTENT_ID]: number;
}

export class FileThumbnailManager extends DataManager<FileThumbnailManager, FileThumbnail> {
  static readonly NAME = 'FileThumbnail';
  static readonly VERSION = 1;

  static readonly KEY_FILE_ID = 'fileId';
  static readonly KEY_FILE_SNAPSHOT_ID = 'fileSnapshotId';
  static readonly KEY_TARGET_FILE_CONTENT_ID = 'targetFileContentId';

  protected get ftsColumns(): (keyof FileThumbnail)[] {
    return [];
  }

  protected upgrade(table: Knex.AlterTableBuilder, oldVersion: number = 0): void {
    if (oldVersion < 1) {
      table.integer(FileThumbnailManager.KEY_FILE_ID).notNullable();
      table.integer(FileThumbnailManager.KEY_FILE_SNAPSHOT_ID).notNullable();
      table.integer(FileThumbnailManager.KEY_TARGET_FILE_CONTENT_ID).notNullable();
    }
  }

  public async get(file: UnlockedFile, fileSnapshot: FileSnapshot): Promise<FileThumbnail> {
    const result = (
      await this.query({
        where: [
          [FileThumbnailManager.KEY_FILE_ID, '=', file[FileManager.KEY_ID]],
          [FileThumbnailManager.KEY_FILE_SNAPSHOT_ID, '=', fileSnapshot[FileSnapshotManager.KEY_ID]]
        ]
      })
    )[0];

    if (result == null) {
      const fileContent = await this.getManager(FileContentManager).getMain(file);
    } else {
    }

    throw 'Not implemented';
  }
}
