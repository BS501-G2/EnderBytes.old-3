import * as SocketIO from "socket.io-client";

export const testFunctions: Record<string, () => void> = {
  socketClient: async () => {
    const client = SocketIO.io("http://localhost:8083");

    client.on("connect", () => {
      client.send({ test: new Uint8Array([1, 2, 34]) });
    });
  },
};
