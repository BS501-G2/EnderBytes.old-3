import { TestFunctions } from "../test.js";
import { Server } from "./core/server.js";

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
};
