import { ClientConnection } from "../client.js";
import { Authentication, fileBufferSize } from "../shared.js";
import FS from "fs";

let currentAuthentication: Authentication | null = null;

export const testFunctions: Record<string, () => void> = {
  socketClient: async () => {
    const client = new ClientConnection(
      () => currentAuthentication,
      (authentication) => (currentAuthentication = authentication),
      "http://localhost:8082"
    );

    const {
      serverFunctions: {
        authenticate,
        whoAmI,
        getFile,
        openNewFile,
        closeFile,
        writeFile,
        readFile,
      },
    } = client;

    await authenticate(
      ["username", "testuser"],
      "password",
      Buffer.from("testuser123;", "utf-8")
    );

    const me = await whoAmI();

    if (me == null) {
      return;
    }

    const rootFolder = await getFile(null);
    const remoteFileHandleId = await openNewFile(rootFolder.id, "Edge.exe");
    const fileHandle = await FS.promises.open(
      "/home/cool/Downloads/MicrosoftEdgeSetup.exe",
      FS.constants.O_RDONLY
    );

    try {
      const fileSize = (await fileHandle.stat()).size;

      for (let position = 0; position < fileSize; position += fileBufferSize) {
        let localBuffer = Buffer.alloc(fileBufferSize);
        const { bytesRead: bufferSize } = await fileHandle.read(
          localBuffer,
          0,
          fileBufferSize,
          position
        );

        localBuffer = localBuffer.subarray(0, bufferSize);

        await writeFile(remoteFileHandleId, position, localBuffer);
        const remoteBuffer = await readFile(
          remoteFileHandleId,
          position,
          fileBufferSize
        );

        console.log(
          localBuffer.compare(remoteBuffer),
          localBuffer,
          remoteBuffer
        );

        position += bufferSize;
      }
    } finally {
      await fileHandle.close();
      await closeFile(remoteFileHandleId);
    }
  },
};
