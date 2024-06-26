import { TestFunctions } from "../test.js";
import { Database } from "./database.js";
import { TestManager, TestResource } from "./db/test-manager.js";

export const testFunctions: TestFunctions = {
  db: async () => {
    const db = new Database();

    await db.start([TestManager]);

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
