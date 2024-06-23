import { Knex } from "knex";
import { Resource, ResourceKey } from "../../shared/db.js";
import { ResourceManager } from "../resource.js";
import { Database } from "../db.js";

export interface TestResource
  extends Resource<TestResource, TestManager, typeof TestKey> {}

export class TestManager extends ResourceManager<
  TestResource,
  TestManager,
  typeof TestKey
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "test", 1, TestKey, [TestKey.Test]);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table.string(TestKey.Test).notNullable();
    }
  }

  
}

export const TestKey = Object.freeze({
  ...ResourceKey,
  Test: "test",
});
