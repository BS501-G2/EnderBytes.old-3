import { getConnection } from "../client.js";

export const testFunctions: Record<string, () => void> = {
  socketClient: async () => {
    const client = getConnection();
    const {
      funcs: { echo, getToken },
    } = client;
  },
};
