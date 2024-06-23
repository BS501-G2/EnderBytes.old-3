import type { ResourceManager } from "../server/resource.js";

export interface ResourceHolder {
  id: number;
}

export type Resource<
  R extends Resource<R, M, K>,
  M extends ResourceManager<R, M, K>,
  K extends typeof ResourceKey
> = {
  [key in keyof K]: R[keyof R];
};

export const ResourceKey = Object.freeze({
  DataId: "dataId",
  RecordId: "recordId",
  CreateTime: "createTime",

  PreviousDataId: "previousId",
  NextDataId: "nextId",
});
