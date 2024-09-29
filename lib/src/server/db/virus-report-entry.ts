import { Knex } from "knex";
import { ResourceManager } from "../resource.js";
import { VirusReportManager } from "./virus-report.js";
import { Database } from "../database.js";
import { VirusReportEntryResource } from "../../shared/db/virus-report-entry.js";

export class VirusReportEntryManager extends ResourceManager<
  VirusReportEntryResource,
  VirusReportEntryManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "VirusReportEntry", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .bigInteger("virusReportId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(VirusReportManager).recordTableName)
        .onDelete("cascade");

      table.string("name").notNullable();
    }
  }
}
