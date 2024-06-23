import { TestFunctions } from "../test.js";
import { deserialize, serialize } from "./serializer.js";

export const testFunctions: TestFunctions = {
  serialize: () => {
    const array: unknown[] = [""];

    const buffer = serialize(array);

    console.log(buffer);

    console.log(deserialize(buffer));
  },
};
