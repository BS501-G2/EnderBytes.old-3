import type { ResourceManager } from "../server/resource.js";

export interface ResourceHolder {
  id: number;
}

export interface Resource<
  R extends Resource<R, M> = never,
  M extends ResourceManager<R, M> = never
> {
  dataId: number;
  id: number;
  createTime: number;

  previousDataId: number | null;
  nextDataId: number | null;
}
