import {
  FileAccessLevel,
  FileType,
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";
import { ServerConnection } from "../api/connection.js";
import { FileContentManager, FileContentResource } from "../db/file-content.js";
import { FileDataManager } from "../db/file-data.js";
import {
  FileSnapshotManager,
  FileSnapshotResource,
} from "../db/file-snapshot.js";
import { FileManager, FileResource, UnlockedFileResource } from "../db/file.js";
import {
  UnlockedUserAuthentication,
  UserAuthentication,
} from "../db/user-authentication.js";
import { UserManager } from "../db/user.js";
import { Server } from "./server.js";

export interface FileManagerServiceData {
  fileHandles: FileHandle[];

  nextId: number;
}

export interface FileHandle {
  id: number;

  connection: ServerConnection;
  authentication: UnlockedUserAuthentication;

  fileId: number;
  fileContentId: number;
  fileSnapshotId: number;

  position: number;

  isThumbnail: boolean;
  hasBytesWritten: boolean;
}

export class FileManagerService extends Service<FileManagerServiceData, []> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<FileManagerServiceData> = null as never;
    super((func) => (getData = func));

    this.#getData = getData;
    this.#server = server;
  }

  readonly #getData: ServiceGetDataCallback<FileManagerServiceData>;
  readonly #server: Server;

  get server() {
    return this.#server;
  }

  get database() {
    return this.#server.database;
  }

  get nextId() {
    const data = this.#getData();

    return ++data.nextId;
  }

  get getManagers() {
    const {
      server: { database },
    } = this;

    return database.getManagers.bind(database);
  }

  async run(
    setData: ServiceSetDataCallback<FileManagerServiceData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const handles: FileHandle[] = [];

    setData({ fileHandles: handles, nextId: 0 });

    await new Promise<void>(onReady);
  }

  async #getHandle(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number
  ): Promise<
    [
      handle: FileHandle,
      file: UnlockedFileResource,
      fileContent: FileContentResource,
      fileSnapshot: FileSnapshotResource
    ]
  > {
    const { fileHandles } = this.#getData();

    const handle = fileHandles.find(
      (fileHandle) =>
        connection.id === fileHandle.connection.id && fileHandle.id === handleId
    );

    if (handle == null) {
      throw new Error("Invalid file handle id. Maybe it was closed?");
    } else if (authentication.id !== handle.authentication.id) {
      throw new Error("Invalid authentication. Maybe it was closed?");
    }

    const [fileManager, fileContentManager, fileSnapshotManager] =
      this.getManagers(FileManager, FileContentManager, FileSnapshotManager);

    const file = await fileManager.getById(handle.fileId);
    const fileContent = await fileContentManager.getById(handle.fileContentId);
    const fileSnapshot = await fileSnapshotManager.getById(
      handle.fileSnapshotId
    );

    if (file == null || fileContent == null || fileSnapshot == null) {
      throw new Error("File may have been deleted");
    }

    const unlockedFile = await fileManager.unlock(file, authentication);

    return [handle, unlockedFile, fileContent, fileSnapshot];
  }

  async #openFile(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot?: FileSnapshotResource
  ) {
    const { fileHandles } = this.#getData();
    const [fileSnapshotManager] = this.getManagers(FileSnapshotManager);

    const fileHandle: FileHandle = {
      id: this.nextId,
      connection: connection,
      authentication: authentication,
      fileId: file.id,
      fileContentId: fileContent.id,
      fileSnapshotId:
        fileSnapshot?.id ??
        (await fileSnapshotManager.getLatest(file, fileContent)).id,
      position: 0,
      isThumbnail: false,
      hasBytesWritten: false,
    };

    fileHandles.push(fileHandle);
    return fileHandle.id;
  }

  public async openNewFile(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    folder: UnlockedFileResource,
    name: string
  ): Promise<number> {
    const [fileManager, fileContentManager] = this.getManagers(
      FileManager,
      FileContentManager
    );

    const file = await fileManager.create(
      authentication,
      folder,
      name,
      FileType.File
    );

    const fileContent = await fileContentManager.getMain(file);

    return await this.#openFile(connection, authentication, file, fileContent);
  }

  public async openFile(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    fileSnapshot?: FileSnapshotResource
  ): Promise<number> {
    const [fileContentManager, fileSnapshotManager] = this.getManagers(
      FileContentManager,
      FileSnapshotManager
    );

    const fileContent = await fileContentManager.getMain(file);
    fileSnapshot ??= await fileSnapshotManager.getLatest(file, fileContent);

    return await this.#openFile(
      connection,
      authentication,
      file,
      fileContent,
      fileSnapshot
    );
  }

  public async openFileThumbnail(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    fileSnapshot?: FileSnapshotResource
  ): Promise<number | null> {
    const [fileContentManager, fileSnapshotManager] = this.getManagers(
      FileContentManager,
      FileSnapshotManager
    );

    const fileContent = await fileContentManager.getMain(file);
    fileSnapshot ??= await fileSnapshotManager.getLatest(file, fileContent);

    const thumbnail = await this.#server.thumbnailer.getThumbnail(
      file,
      fileSnapshot
    );

    if (thumbnail == null || thumbnail.fileThumbnailContentId == null) {
      return null;
    }

    const thumbnailContent = await fileContentManager.getById(
      thumbnail.fileThumbnailContentId
    );

    if (thumbnailContent == null) {
      return null;
    }

    const thumbnailSnapshot = await fileSnapshotManager.getLatest(
      file,
      thumbnailContent
    );

    return await this.#openFile(
      connection,
      authentication,
      file,
      thumbnailContent,
      thumbnailSnapshot
    );
  }

  public close(connection: ServerConnection, id: number) {
    const { fileHandles } = this.#getData();
    const index = fileHandles.findIndex((fileHandle) => fileHandle.id === id);

    if (index >= 0) {
      fileHandles.splice(index, 1);
    }
  }

  public async read(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    length: number
  ) {
    const [fileHandle, file, fileContent, fileSnapshot] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );
    const [fileDataManager] = this.getManagers(FileDataManager);

    const data = await fileDataManager.readData(
      file,
      fileContent,
      fileSnapshot,
      fileHandle.position,
      length
    );

    fileHandle.position += data.length;
    return data;
  }

  public async write(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    buffer: Uint8Array
  ) {
    const [fileHandle, file, fileContent, fileSnapshot] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );

    if (fileHandle.isThumbnail) {
      throw new Error("Cannot write to thumbnail");
    }

    const [fileDataManager, fileSnapshotManager, userManager] =
      this.getManagers(FileDataManager, FileSnapshotManager, UserManager);

    const user = await userManager.getById(fileHandle.authentication.userId);
    if (user == null) {
      throw new Error("User not found");
    }

    if (!fileHandle.hasBytesWritten) {
      const newSnapshot = await fileSnapshotManager.create(
        file,
        fileContent,
        fileSnapshot,
        user
      );

      await fileDataManager.writeData(
        file,
        fileContent,
        newSnapshot,
        fileHandle.position,
        buffer
      );

      fileHandle.fileSnapshotId = newSnapshot.id;
      fileHandle.hasBytesWritten = true;
    } else {
      await fileDataManager.writeData(
        file,
        fileContent,
        fileSnapshot,
        fileHandle.position,
        buffer
      );
    }

    fileHandle.position += buffer.length;
  }

  public async seek(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    position: number
  ) {
    const [fileHandle, , , fileSnapshot] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );

    if (position < 0 || position > fileSnapshot.size) {
      throw new Error("Invalid position");
    }

    fileHandle.position = position;
  }

  public async position(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number
  ): Promise<number> {
    const [handle] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );

    return handle.position;
  }

  public async length(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number
  ): Promise<number> {
    const [, , , fileSnapshot] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );

    return fileSnapshot.size;
  }

  public async truncate(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    length: number
  ) {
    const [handle, file, fileContent, fileSnapshot] = await this.#getHandle(
      connection,
      authentication,
      handleId
    );

    if (handle.isThumbnail) {
      throw new Error("Cannot truncate thumbnails");
    }

    const [fileDataManager] = this.getManagers(
      FileDataManager,
      FileSnapshotManager
    );

    await fileDataManager.truncateData(file, fileContent, fileSnapshot, length);
  }

  public removeAllHandles(connection?: ServerConnection) {
    const { fileHandles } = this.#getData();

    for (let index = 0; index < fileHandles.length; index++) {
      const fileHandle = fileHandles[index];

      if (connection != null && connection.id != fileHandle.connection.id) {
        return;
      }

      fileHandles.splice(index, 1);
    }
  }
}
