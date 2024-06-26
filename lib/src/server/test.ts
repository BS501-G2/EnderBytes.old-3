import { TestFunctions } from "../test.js";
import { Database } from "./database.js";
import { FileAccessManager } from "./db/file-access.js";
import { FileContentManager } from "./db/file-content.js";
import { FileManager } from "./db/file.js";
import { TestManager, TestResource } from "./db/test-manager.js";
import { UserAuthenticationManager } from "./db/user-authentication.js";
import { UserSessionManager } from "./db/user-session.js";
import { UserManager } from "./db/user.js";

export const testFunctions: TestFunctions = {
  db: async () => {
    const db = new Database();

    await db.start([
      FileAccessManager,
      FileContentManager,
      FileManager,
      TestManager,
      UserAuthenticationManager,
      UserSessionManager,
      UserManager,
    ]);

    const [testManager] = db.getManagers(TestManager);

    await db.transact(async () => {
      for (let index = 0; index < 1000; index++) {
        await testManager.create(`test: ${index}`, index);
      }

      const tests: TestResource[] = [];
      for await (const test of testManager.readStream()) {
        tests.push(test);
      }

      console.log(tests.length);

      for (const test of tests) {
        await testManager.update(test, {
          test: `test: ${test.number + 1}`,
          number: test.number + 1,
        });
      }

      await testManager.purgeWhere([["test", "like", "test: %"]]);

      console.log(tests.length);
    });
  },
};
