export type FileAccessLevel = "None" | "Read" | "ReadWrite" | "Manage" | "Full";

const fileAccessLevelConversionOrder: FileAccessLevel[] = [
  "None",
  "Read",
  "ReadWrite",
  "Manage",
  "Full",
];

export function serializeFileAccessLevel(level: FileAccessLevel): number {
  const index = fileAccessLevelConversionOrder.indexOf(level);

  if (index < 0) {
    throw new Error(`Invalid file access level: ${level}`);
  }

  return index;
}

export function deserializeFileAccessLevel(level: number): FileAccessLevel {
  if (level < 0 || level >= fileAccessLevelConversionOrder.length) {
    throw new Error(`Invalid file access level: ${level}`);
  }

  return fileAccessLevelConversionOrder[level];
}
