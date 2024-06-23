import { TestFunctions } from "../test.js";
import { Database } from "./db.js";
import { TestManager } from "./db/test-manager.js";

export const testFunctions: TestFunctions = {
  db: async () => {
    const db = new Database();

    await db.start([TestManager]);
  },
};
