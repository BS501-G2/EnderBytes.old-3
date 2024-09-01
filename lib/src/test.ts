import { testFunctions as clientTestFunctions } from "./client/test.js";
import { testFunctions as serverTestFunctions } from "./server/test.js";
import { testFunctions as sharedTestFunctions } from "./shared/test.js";

export type TestFunctions = Record<string, () => Promise<void> | void>;

export async function test(
  ...args:
    | ["client", name: keyof typeof clientTestFunctions]
    | ["server", name: keyof typeof serverTestFunctions]
    | ["shared", name: keyof typeof sharedTestFunctions]
): Promise<void> {
  if (args[0] === "client") {
    await clientTestFunctions[args[1]]();
  } else if (args[0] === "server") {
    await serverTestFunctions[args[1]]();
  } else if (args[0] === "shared") {
    await sharedTestFunctions[args[1]]();
  } else {
    throw new Error("Invalid test type");
  }
}

void test(process.argv[2] as never, process.argv[3] as never).catch(
  console.error
);
