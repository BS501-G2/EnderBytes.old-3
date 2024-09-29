import { Resource } from "../resource.js";

export interface VirusReportEntryResource extends Resource {
  virusReportId: number;

  name: string;
}
