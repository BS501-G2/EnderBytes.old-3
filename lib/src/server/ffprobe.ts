import { spawn } from "child_process";
import { Stream } from "stream";

export type FFmpegFormat = [name: string, longName: string];
export type FFmpegCodec = [
  name: string,
  longName: string,
  timeBase: number,
  tag: number,
  tagString: string
];
export type FFmpegTag = [key: string, value: string];
export type FFmpegVideoFramerate = [numerator: number, denominator: number];
export type FFmpegStreamType = "video" | "audio" | "subtitle";

function getTags(data: Record<any, any> = {}): FFmpegTag[] {
  return Object.keys(data)?.map((key) => [`${key}`, `${data[key]}`]);
}

function getFramerate(data: any): FFmpegVideoFramerate {
  const rate = eval(data) || 0;

  return [1, rate === 0 ? 0 : 1 / rate];
}

export abstract class FFmpegStream {
  public static parse(info: FFmpegMediaInfo, data: any): FFmpegStream {
    const { codec_type } = data;

    switch (codec_type) {
      case "video":
        return new FFmpegVideoStream(info, data);
      case "audio":
        return new FFmpegAudioStream(info, data);
      case "subtitle":
        return new FFmpegSubtitleStream(info, data);

      default:
        throw new Error(`Unsupported stream type: ${codec_type}`);
    }
  }

  public constructor(info: FFmpegMediaInfo, type: FFmpegStreamType, data: any) {
    this.#info = info;
    this.#type = type;
    this.#codec = (() => {
      const codecName: string = data.codec_name;
      const codecLongName: string = data.codec_long_name;
      const timeBase: number = ((timeBase) =>
        timeBase === 0 ? 0 : 1 / timeBase)(eval(data.codec_time_base || data.time_base) || 0);
      const tag: number = Number(data.codec_tag) || 0;
      const tagString: string = data.codec_tag_string;

      return [codecName, codecLongName, timeBase, tag, tagString];
    })();
  }

  readonly #info: FFmpegMediaInfo;
  readonly #codec: FFmpegCodec;
  readonly #type: FFmpegStreamType;

  public get info() {
    return this.#info;
  }

  public get codec() {
    return this.#codec;
  }

  public get type() {
    return this.#type;
  }

  public toJSON(): this {
    const { codec, type } = this;

    return { codec, type } as this;
  }
}

export class FFmpegVideoStream extends FFmpegStream {
  public constructor(info: FFmpegMediaInfo, data: any) {
    super(info, "video", data);

    this.#width = Number(data.width) || 0;
    this.#height = Number(data.height) || 0;
    this.#hasBFrames = Boolean(data.b_frames);
    this.#pixelFormat = data.pix_fmt;
    this.#level = Number(data.level) || 0;
    this.#frameRate = getFramerate(data.r_frame_rate);
    this.#averageFrameRate = getFramerate(data.avg_frame_rate);
    this.#duration = Number(data.duration) || 0;

    this.#tags = getTags(data.tags);
  }

  readonly #width: number;
  readonly #height: number;
  readonly #hasBFrames: boolean;
  readonly #pixelFormat: string;
  readonly #level: number;
  readonly #frameRate: FFmpegVideoFramerate;
  readonly #averageFrameRate: FFmpegVideoFramerate;
  readonly #duration: number;
  readonly #tags: FFmpegTag[];

  public get width() {
    return this.#width;
  }

  public get height() {
    return this.#height;
  }

  public get hasBFrames() {
    return this.#hasBFrames;
  }

  public get pixelFormat() {
    return this.#pixelFormat;
  }

  public get level() {
    return this.#level;
  }

  public get frameRate() {
    return this.#frameRate;
  }

  public get averageFrameRate() {
    return this.#averageFrameRate;
  }

  public get duration() {
    return this.#duration;
  }

  public get tags() {
    return [...this.#tags];
  }

  public toJSON(): this {
    const { width, height, hasBFrames, pixelFormat, level } = this;

    const a = {
      ...super.toJSON(),
      width,
      height,
      hasBFrames,
      pixelFormat,
      level,
    } as this;

    return a;
  }
}

export class FFmpegAudioStream extends FFmpegStream {
  public constructor(info: FFmpegMediaInfo, data: any) {
    super(info, "audio", data);

    console.log(data);
  }
}

export class FFmpegSubtitleStream extends FFmpegStream {
  public constructor(info: FFmpegMediaInfo, data: any) {
    super(info, "subtitle", data);
  }
}

export class FFmpegMediaInfo {
  public static async fromFile(
    file: string | Buffer | Stream
  ): Promise<FFmpegMediaInfo> {
    const info = await FFmpegMediaInfo.#exec(file);

    return info;
  }

  static #exec(file: string | Buffer | Stream): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      const output: Buffer[] = [];
      const error: Buffer[] = [];

      const args: string[] = [
        "-hide_banner",
        "-print_format",
        "json",
        "-show_streams",
        "-show_format",
      ];

      if (typeof file === "string") {
        args.push(file);
      } else {
        args.push("-");
      }

      const ffprobe = spawn("ffprobe", args);
      const { stderr, stdin, stdout } = ffprobe;

      stdout.on("data", (data) => output.push(data));
      stderr.on("data", (data) => error.push(data));

      ffprobe.once("spawn", () => {
        if (Buffer.isBuffer(file)) {
          stdin.end(file);
        } else if (file instanceof Stream) {
          file.pipe(stdin);
        }
      });

      ffprobe.once("error", reject);
      ffprobe.once("close", (code) => {
        if (code === 0) {
          try {
            const json = Buffer.concat(output).toString();

            resolve(new this(JSON.parse(json)));
          } catch (error) {
            reject(error);
          }
        } else {
          const message = Buffer.concat(output).toString().trim();

          reject(new Error(message));
        }
      });
    });
  }

  public constructor(data: any) {
    const { format, streams } = data;

    this.#file = format.filename ?? null;
    this.#streams = streams.map((a: any) => FFmpegStream.parse(this, a));
    this.#format = [`${format.format_name}`, `${format.format_long_name}`];
    this.#start = Number(format.start_time) || 0;
    this.#duration = Number(format.duration) || 0;
    this.#bitrate = Number(format.bit_rate) || 0;
    this.#size = Number(format.size) || 0;
    this.#tags = getTags(format.tags);
  }

  readonly #file: string | null;
  readonly #streams: FFmpegStream[];
  readonly #format: FFmpegFormat;
  readonly #start: number;
  readonly #duration: number;
  readonly #bitrate: number;
  readonly #size: number;
  readonly #tags: FFmpegTag[];

  public get file() {
    return this.#file;
  }

  public get streams() {
    return [...this.#streams];
  }

  public get format() {
    return this.#format;
  }

  public get start() {
    return this.#start;
  }

  public get duration() {
    return this.#duration;
  }

  public get bitrate() {
    return this.#bitrate;
  }

  public get size() {
    return this.#size;
  }

  public get tags() {
    return [...this.#tags];
  }

  public toJSON() {
    const { file, streams, format, start, duration, bitrate, size, tags } =
      this;

    return { file, streams, format, start, duration, bitrate, size, tags };
  }
}

export class FFmpeg {
  public constructor() {}

  public async input() {}
}
