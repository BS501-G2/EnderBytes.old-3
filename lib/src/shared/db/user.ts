export enum UserRole {
  Member,
  SiteAdmin,
  SystemAdmin,
}

export const usernameLength: [min: number, max: number] = [6, 16] as const;
export const usernameValidCharacters = Object.freeze(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_."
);

export enum UsernameVerificationFlag {
  OK = 0,
  InvalidCharacters = 1 << 0,
  InvalidLength = 1 << 1,
  Taken = 1 << 2,
}
