import { TestFunctions } from "../test.js";
import { Server } from "./core/server.js";

import * as SocketIO from "socket.io";

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
};
