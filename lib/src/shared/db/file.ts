export type FileType = 'file' | 'folder';

export const fileNameLength: readonly [min: number, max: number] =
  Object.freeze([1, 256]);
export const fileNameInvalidCharacters = "\\/:*?'\"<>|";

export const FileNameVerificationFlag = Object.freeze({
  OK: 0,
  InvalidCharacters: 1 << 0,
  InvalidLength: 1 << 1,
  FileExists: 1 << 2,
})

export const fileBufferSize = 1_024 * 64;
export const fileIoSize = 1024 * 1024;
