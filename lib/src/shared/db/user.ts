export enum UserRole {
  Member,
  SiteAdmin,
  SystemAdmin,
}

export const usernameLength: readonly [min: number, max: number] = Object.freeze([6, 16]);
export const usernameValidCharacters = Object.freeze(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_."
);

export enum UsernameVerificationFlag {
  OK = 0,
  InvalidCharacters = 1 << 0,
  InvalidLength = 1 << 1,
  Taken = 1 << 2,
}
