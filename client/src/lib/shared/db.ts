
export enum UserKeyType {
  Password,
  Session
}

export enum FileType {
  File,
  Folder
}

export enum FileAccessLevel {
  None,
  Read,
  ReadWrite,
  Manage,
  Full
}

export const fileNameLength: [min: number, max: number] = [1, 256] as const;
export const fileNameInvalidCharacters = '\\/:*?\'"<>|';

export enum FileNameVerificationFlag {
  OK = 0,
  InvalidCharacters = 1 << 0,
  InvalidLength = 1 << 1,
  FileExists = 1 << 2
}
