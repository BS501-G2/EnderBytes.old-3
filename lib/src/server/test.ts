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

  socketServer: async () => {
    const server = new SocketIO.Server({ cors: { origin: "*" } });

    server.on("connection", (connection) => {
      connection.on("message", console.log);
    });

    server.listen(8083);
  },
};
