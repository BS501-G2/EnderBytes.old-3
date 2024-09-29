import { Knex } from "knex";
import { ResourceManager } from "../resource.js";
import { FileManager } from "./file.js";
import { FileContentManager } from "./file-content.js";
import { FileSnapshotManager } from "./file-snapshot.js";
import { Database } from "../database.js";
import { VirusReportEntryManager } from "./virus-report-entry.js";
import { VirusReportResource } from "../../shared/db/virus-report.js";
import { FileSnapshotResource } from "../../shared/db/file-snapshot.js";
import { FileContentResource } from "../../shared/db/file-content.js";
import { FileResource } from "../../shared.js";

export class VirusReportManager extends ResourceManager<
  VirusReportResource,
  VirusReportManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "VirusReport", 1);
  }

  protected upgrade(table: Knex.AlterTableBuilder, version: number): void {
    if (version < 1) {
      table
        .integer("fileId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileContentId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileContentManager).recordTableName)
        .onDelete("cascade");

      table
        .integer("fileSnapshotId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(FileSnapshotManager).recordTableName)
        .onDelete("cascade");
    }
  }

  public async getScanResult(
    file: FileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource
  ): Promise<string[] | null> {
    const virusReport = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["fileContentId", "=", fileContent.id],
        ["fileSnapshotId", "=", fileSnapshot.id],
      ],
    });

    if (virusReport == null) {
      return null;
    }

    const viruses: string[] = [];
    for await (const virus of this.getManager(
      VirusReportEntryManager
    ).readStream({
      where: [["virusReportId", "=", virusReport.id]],
    })) {
      viruses.push(virus.name);
    }

    return viruses;
  }

  public async setScanResult(
    file: FileResource,
    fileContent: FileContentResource,
    fileSnapshot: FileSnapshotResource,
    viruses: string[]
  ) {
    const [virusReportEntries] = this.getManagers(VirusReportEntryManager);

    let virusReport = await this.first({
      where: [
        ["fileId", "=", file.id],
        ["fileContentId", "=", fileContent.id],
        ["fileSnapshotId", "=", fileSnapshot.id],
      ],
    });

    if (virusReport != null) {
      await virusReportEntries.deleteWhere([
        ["virusReportId", "=", virusReport.id],
      ]);
    } else {
      virusReport = await this.insert({
        fileId: file.id,
        fileContentId: fileContent.id,
        fileSnapshotId: fileSnapshot.id,
      });
    }

    await virusReportEntries.insertMany(
      viruses.map((name) => ({
        virusReportId: virusReport.id,
        name,
      }))
    );

    return virusReport;
  }
}
