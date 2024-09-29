export interface ResourceHolder {
  id: number;
}

export interface Resource {
  dataId: number;
  id: number;
  createTime: number;

  previousDataId: number | null;
  nextDataId: number | null;
}

export interface ResourceRecordStats {
  id: number;
  createTime: number;
  updateTime: number;
}
