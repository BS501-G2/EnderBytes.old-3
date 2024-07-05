import { TestFunctions } from "../test.js";
import { Server } from "./core/server.js";
import ClamAV from "clamscan";
import FileSystem from "fs";

import * as SocketIO from "socket.io";

process.on("warning", () => {});
process.on('uncaughtException', () => {})

export const testFunctions: TestFunctions = {
  server: async () => {
    const server = new Server();
    await server.start(8082);

    const onStop = () => {
      server.stop();

      process.off("SIGINT", onStop);
    };

    process.on("SIGINT", onStop);
  },

  scan: async () => {
    const clam = new ClamAV();
    await clam.init({
      clamdscan: {
        socket: "/run/clamav/clamd.ctl",
      },
      debugMode: false,
    });

    const files: string[] = [
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
      "/home/carl/Downloads/eicar.txt",
    ];

    for (const file of files) {
      const stream = FileSystem.createReadStream(file);

      try {
        const result = await clam.scanStream(stream);
        console.log(result);
      } catch (error: unknown) {
        // console.log(`error:`, error);
      } finally {
        stream.destroy();
      }
    }
  },
};
