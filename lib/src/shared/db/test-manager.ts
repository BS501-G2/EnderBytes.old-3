import { Resource } from "../resource.js";

export interface TestResource extends Resource {
  test: string;
  number: number;
}
