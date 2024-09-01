import { spawn } from "child_process";
import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
  FileThumbnailerStatusType,
  ServiceGetDataCallback,
  TaskQueue,
  createTaskQueue,
} from "../../shared.js";
import { FileContentManager, FileContentResource } from "../db/file-content.js";
import {
  FileSnapshotManager,
  FileSnapshotResource,
} from "../db/file-snapshot.js";
import {
  FileThumbnailManager,
  FileThumbnailResource,
} from "../db/file-thumbnail.js";
import { FileManager, FileResource, UnlockedFileResource } from "../db/file.js";
import { Server } from "./server.js";
import { VirusScannerData } from "./virus-scanner.js";
import { FileDataManager } from "../db/file-data.js";

export interface ThumbnailerData {
  pendingList: ThumbnailerQueueEntry[];
  taskQueue: TaskQueue;
}

export type ThumbnailerQueueEntry = {
  fileId: number;
  fileSnapshotId: number;
  status: () => FileThumbnailerStatusType;
  promise: Promise<FileThumbnailResource | null>;
};

export type ThumbnailerOptions = [];

export class Thumbnailer extends Service<ThumbnailerData, ThumbnailerOptions> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<ThumbnailerData> = null as never;

    super((func) => (getData = func), server);

    this.#server = server;
    this.#getData = getData;
  }

  readonly #server: Server;
  readonly #getData: ServiceGetDataCallback<ThumbnailerData>;

  async #getThumbnail(
    file: UnlockedFileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource
  ): Promise<FileThumbnailResource | null> {
    const { mimeDetector, database } = this.#server;
    const [[type, subtype]] = await mimeDetector.getFileMime(
      file,
      fileContent,
      fileSnapshot
    );
    const [
      fileManager,
      fileDataManager,
      fileContentManager,
      fileSnapshotManager,
      fileThumbnailManager,
    ] = database.getManagers(
      FileManager,
      FileDataManager,
      FileContentManager,
      FileSnapshotManager,
      FileThumbnailManager
    );

    const thumbnailContent = await fileContentManager.create(file);
    const thumbnailSnapshot = await fileSnapshotManager.getRoot(
      file,
      thumbnailContent
    );

    if (type === "image") {
      const contentStream = fileDataManager.readDataStream(
        file,
        fileContent,
        fileSnapshot
      );

      let written: number = 0;
      for await (const chunk of getThumbnail(
        toBufferGenerator(contentStream)
      )) {
        await fileDataManager.writeData(
          file,
          thumbnailContent,
          thumbnailSnapshot,
          written,
          chunk
        );
        written += chunk.length;
      }

      return await fileThumbnailManager.create(
        file,
        fileSnapshot,
        FileThumbnailerStatusType.Available,
        thumbnailContent
      );

      // } else if (type === "video") {
      // } else if (type === "audio") {
      //   return null
    }
    return null;
  }

  async run(
    setData: ServiceSetDataCallback<ThumbnailerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const pendingList: ThumbnailerQueueEntry[] = [];
    const taskQueue: TaskQueue = createTaskQueue();

    setData({
      pendingList: pendingList,
      taskQueue,
    });

    await new Promise<void>(onReady);
  }

  #getPending(file: FileResource, fileSnapshotId: FileSnapshotResource) {
    return this.#getData().pendingList.find(
      (entry) =>
        entry.fileId === file.id && entry.fileSnapshotId === fileSnapshotId.id
    );
  }

  public async getThumbnail(
    file: UnlockedFileResource,
    fileSnapshot: FileSnapshotResource
  ) {
    const { taskQueue, pendingList } = this.#getData();

    const pending = this.#getPending(file, fileSnapshot);

    if (pending != null) {
      return await pending.promise;
    }

    const [fileThumbnailManager, fileContentManager] =
      this.#server.database.getManagers(
        FileThumbnailManager,
        FileContentManager
      );

    const fileThumbnail = await fileThumbnailManager.getByFile(
      file,
      fileSnapshot
    );

    if (fileThumbnail != null) {
      return fileThumbnail;
    }

    return await taskQueue.pushQueue(async () => {
      const fileContent = await fileContentManager.getMain(file);

      return await this.#getThumbnail(file, fileContent, fileSnapshot);
    });
  }
}

async function* toBufferGenerator(
  stream: NodeJS.ReadableStream
): AsyncGenerator<Buffer> {
  for await (const chunk of stream) {
    if (typeof chunk === "string") {
      yield Buffer.from(chunk);
    } else {
      yield chunk;
    }
  }
}

export async function* getThumbnail(
  stdin: AsyncGenerator<Buffer>
): AsyncGenerator<Buffer> {
  type PromiseSource<T> = [
    Promise<T>,
    (value: T) => void,
    (error: Error) => void
  ];

  function createPromiseSource<T>(): PromiseSource<T> {
    let resolve: (value: T) => void = null as never;
    let reject: (error: Error) => void = null as never;

    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });

    return [promise, resolve!, reject!];
  }

  const backlog: (Buffer | Error | null)[] = [];
  const promises: PromiseSource<Buffer | null>[] = [];

  void (async () => {
    const args: string[] = [];

    args.push("-i", "-");

    args.push("-vf", "scale=256:-1");
    args.push("-c:v", "png");
    args.push("-frames:v", "1");
    args.push("-f", "image2pipe");

    args.push("-");

    const ffmpeg = spawn("ffmpeg", args);
    const error: Buffer[] = [];

    ffmpeg.stderr.on("data", (data) => error.push(data));
    ffmpeg.stdout.on("data", (data) => {
      const source = promises.shift();

      if (source == null) {
        backlog.push(data);
      } else {
        source[1](data);
      }
    });

    ffmpeg.once("exit", (code) => {
      function push(item: Buffer | Error | null) {
        const source = promises.shift();

        if (source == null) {
          backlog.push(item);
        } else if (item instanceof Error) {
          source[2](item);
        } else {
          source[1](item);
        }
      }

      if (code !== 0) {
        push(new Error(Buffer.concat(error).toString()));
      } else {
        push(null);
      }
    });

    for await (const buffer of stdin) {
      await new Promise<void>((resolve, reject) => {
        ffmpeg.stdin.write(buffer, (error) => {
          if (error != null) {
            reject(error);
          } else {
            resolve();
          }
        });
      });
    }
  })();

  while (true) {
    let item: Buffer | Error | null = null;

    const buffer = backlog.shift();

    if (buffer === undefined) {
      const source = createPromiseSource<Buffer | null>();
      promises.push(source);
      item = await source[0];
    } else {
      item = buffer;
    }

    if (item == null) {
      break;
    } else if (item instanceof Error) {
      throw item;
    } else {
      yield item;
    }
  }
}
