import { ClientConnection } from "../client.js";
import { Authentication } from "../shared.js";

let currentAuthentication: Authentication | null = null;

export const testFunctions: Record<string, () => void> = {
  socketClient: async () => {
    const client = new ClientConnection(
      () => currentAuthentication,
      (authentication) => (currentAuthentication = authentication)
    );

    await client.serverFunctions.authenticate(
      ["username", "testuser"],
      "password",
      Buffer.from("testuser123;", "utf-8")
    );

    // const fileHandle =
  },
};
