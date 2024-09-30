import { TestFunctions } from "../test.js";
import { Server } from "./core/server.js";
import FileSystem from "fs";
import { FFmpeg, FFmpegMediaInfo } from "./ffprobe.js";
import { getThumbnail } from "./core/thumbnailer.js";

process.on("warning", () => {});
process.on("uncaughtException", () => {});

export const testFunctions: TestFunctions = {
  server: async () => {
    const server = new Server();
    await server.start(8082);

    const onStop = () => {
      server.stop();

      process.off("SIGINT", onStop);
    };

    process.on("SIGINT", onStop);
  },

  ffmpeg: async () => {
    const file = FileSystem.createReadStream(
      "/home/cool/Documents/1661603754-1661603754-monika-doki-doki-literature-club-anime-live-wallpaper-free.mp4"
    );

    const outputFile = await FileSystem.promises.open("/tmp/thumb.png", "w");

    for await (const fileBuffer of getThumbnail(generatorFromStream(file))) {
      console.log(fileBuffer.length);
      await outputFile.write(fileBuffer as Uint8Array);
    }

    await outputFile.close();
  },
};

async function* generatorFromStream(
  stream: NodeJS.ReadableStream
): AsyncGenerator<Buffer> {
  for await (const buffer of stream) {
    if (typeof buffer === "string") {
      yield Buffer.from(buffer);
    } else {
      yield buffer;
    }
  }
}
