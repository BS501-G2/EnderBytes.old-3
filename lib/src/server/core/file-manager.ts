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

  async #openFile(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    isThumbnail: boolean
  ) {
    const { database } = this;
    const { fileHandles } = this.#getData();

    const entry: FileHandle = {
      id: this.nextId,

      connection,
      authentication,

      fileId: file.id,
      fileContentId: fileContent.id,
      fileSnapshotId: fileSnapshot.id,

      position: 0,
      isThumbnail,
      hasBytesWritten: false,
    };

    fileHandles.push(entry);
    return entry.id;
  }

  #getHandle(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number
  ): FileHandle {
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

    return handle;
  }

  public removeHandles(connection?: ServerConnection) {
    const { fileHandles } = this.#getData();

    for (let index = 0; index < fileHandles.length; index++) {
      const fileHandle = fileHandles[index];

      if (connection != null && connection.id != fileHandle.connection.id) {
        return;
      }

      fileHandles.splice(index, 1);
    }
  }

  public async openNewFile(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    folder: UnlockedFileResource,
    name: string
  ) {
    const [fileManager, fileContentManager, fileSnapshotManager] =
      this.getManagers(FileManager, FileContentManager, FileSnapshotManager);

    const file = await fileManager.create(
      authentication,
      folder,
      name,
      FileType.File
    );

    const fileContent = await fileContentManager.getMain(file);
    const fileSnapshot = await fileSnapshotManager.getLatest(file, fileContent);

    return this.#openFile(
      connection,
      authentication,
      file,
      fileContent,
      fileSnapshot,
      false
    );
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

    return this.#openFile(
      connection,
      authentication,
      file,
      fileContent,
      fileSnapshot,
      false
    );
  }

  public async openFileThumbnail(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    file: UnlockedFileResource,
    fileSnapshot?: FileSnapshotResource
  ): Promise<number | null> {
    const {
      server: { thumbnailer },
    } = this;
    const [fileContentManager, fileSnapshotManager] = this.getManagers(
      FileContentManager,
      FileSnapshotManager
    );

    fileSnapshot ??= await fileSnapshotManager.getLatest(
      file,
      await fileContentManager.getMain(file)
    );

    const fileThumbnail = await thumbnailer.getThumbnail(file, fileSnapshot);

    if (fileThumbnail == null || fileThumbnail.fileThumbnailContentId == null) {
      return null;
    }

    const fileThumbnailContent = await fileContentManager.getById(
      fileThumbnail.fileThumbnailContentId
    );

    if (fileThumbnailContent == null) {
      return null;
    }

    const fileThumbnailSnapshot = await fileSnapshotManager.getLatest(
      file,
      fileThumbnailContent
    );

    return this.#openFile(
      connection,
      authentication,
      file,
      fileThumbnailContent,
      fileThumbnailSnapshot,
      true
    );
  }

  public close(connection: ServerConnection, id: number) {
    const { fileHandles } = this.#getData();

    const index = fileHandles.findIndex(
      (fileHandle) =>
        connection.id === fileHandle.connection.id && fileHandle.id === id
    );

    if (index < 0) {
      return;
    }

    fileHandles.splice(index, 1);
  }

  public async read(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    length: number
  ) {
    const [
      fileManager,
      fileContentManager,
      fileSnapshotManager,
      fileDataManager,
    ] = this.getManagers(
      FileManager,
      FileContentManager,
      FileSnapshotManager,
      FileDataManager
    );

    const handle = this.#getHandle(connection, authentication, handleId);

    const file = await fileManager.getById(handle.fileId);

    const fileContent = await fileContentManager.getById(handle.fileContentId);
    const fileSnapshot = await fileSnapshotManager.getById(
      handle.fileSnapshotId
    );

    if (file == null || fileContent == null || fileSnapshot == null) {
      throw new Error("File may have been deleted");
    }

    const unlockedFile = await fileManager.unlock(
      file,
      authentication,
      FileAccessLevel.Read
    );

    const buffer = await fileDataManager.readData(
      unlockedFile,
      fileContent,
      fileSnapshot,
      handle.position,
      length
    );

    handle.position += length;
    return buffer;
  }

  public async write(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    buffer: Uint8Array
  ) {
    const [
      fileManager,
      fileContentManager,
      fileSnapshotManager,
      fileDataManager,
      userManager,
    ] = this.getManagers(
      FileManager,
      FileContentManager,
      FileSnapshotManager,
      FileDataManager,
      UserManager
    );

    const handle = this.#getHandle(connection, authentication, handleId);

    const file = await fileManager.getById(handle.fileId);
    const fileContent = await fileContentManager.getById(handle.fileContentId);
    const fileSnapshot = await fileSnapshotManager.getById(
      handle.fileSnapshotId
    );
    const user = await userManager.getById(authentication.userId);

    if (
      file == null ||
      fileContent == null ||
      fileSnapshot == null ||
      user == null
    ) {
      throw new Error("File may have been deleted");
    }

    const newSnapshot = handle.hasBytesWritten
      ? fileSnapshot
      : await fileSnapshotManager.create(file, fileContent, fileSnapshot, user);

    handle.fileSnapshotId = newSnapshot.id;
    handle.hasBytesWritten = true;

    const unlockedFile = await fileManager.unlock(
      file,
      authentication,
      FileAccessLevel.ReadWrite
    );

    await fileDataManager.writeData(
      unlockedFile,
      fileContent,
      newSnapshot,
      handle.position,
      buffer
    );

    handle.position += buffer.length;
  }

  public async seek(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    position: number
  ) {
    const handle = this.#getHandle(connection, authentication, handleId);
    const [fileManager, fileSnapshotManager, fileContentManager] =
      this.getManagers(FileManager, FileSnapshotManager, FileContentManager);

    const file = await fileManager.getById(handle.fileId);
    const fileContent = await fileContentManager.getById(handle.fileContentId);
    const fileSnapshot = await fileSnapshotManager.getById(
      handle.fileSnapshotId
    );

    if (file == null || fileContent == null || fileSnapshot == null) {
      throw new Error("File may have been deleted");
    }

    if (position < 0 || position > fileSnapshot.size) {
      throw new Error("Invalid position");
    }

    const unlockedFile = await fileManager.unlock(
      file,
      authentication,
      FileAccessLevel.ReadWrite
    );

    handle.position = position;
  }

  public async truncate(
    connection: ServerConnection,
    authentication: UnlockedUserAuthentication,
    handleId: number,
    length: number
  ) {
    const handle = this.#getHandle(connection, authentication, handleId);

    const [fileManager, fileSnapshotManager, fileContentManager, fileDataManager] =
      this.getManagers(FileManager, FileSnapshotManager, FileContentManager, FileDataManager);

    const file = await fileManager.getById(handle.fileId);
    const fileContent = await fileContentManager.getById(handle.fileContentId);
    const fileSnapshot = await fileSnapshotManager.getById(
      handle.fileSnapshotId
    );

    if (file == null || fileContent == null || fileSnapshot == null) {
      throw new Error("File may have been deleted");
    }

    if (length < 0 || length > fileSnapshot.size) {
      throw new Error("Invalid length");
    }

    const unlockedFile = await fileManager.unlock(
      file,
      authentication,
      FileAccessLevel.ReadWrite
    );

    handle.position = Math.min(length, handle.position);
  }
}
