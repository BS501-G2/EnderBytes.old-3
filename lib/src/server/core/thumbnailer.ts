import {
  Service,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";

export interface ThumbnailerData {
}

export type ThumbnailerOptions = [];

export class Thumbnailer extends Service<ThumbnailerData, ThumbnailerOptions> {
  async run(
    setData: ServiceSetDataCallback<ThumbnailerData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    setData({});

    await new Promise<void>(onReady);
  }
}
