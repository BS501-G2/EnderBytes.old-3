import { Knex } from "knex";
import { Resource, ResourceManager } from "../resource.js";
import { Database } from "../database.js";

export interface TestResource extends Resource<TestResource, TestManager> {
  test: string;
  number: number;
}

export class TestManager extends ResourceManager<TestResource, TestManager> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "test", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table.string("test").notNullable();
      table.integer("number").notNullable();
    }
  }

  public async create(test: string, number: number): Promise<TestResource> {
    return await this.insert({ test, number });
  }
}
