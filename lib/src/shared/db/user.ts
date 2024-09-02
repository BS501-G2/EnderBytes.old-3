export type UserRole = "Member" | "SiteAdmin" | "SystemAdmin";

export function serializeUserRole(role: UserRole): number {
  switch (role) {
    case "Member":
      return 0;
    case "SiteAdmin":
      return 1;
    case "SystemAdmin":
      return 2;
    default:
      throw new Error(`Invalid user role: ${role}`);
  }
}

export function deserializeUserRole(role: number): UserRole {
  switch (role) {
    case 0:
      return "Member";
    case 1:
      return "SiteAdmin";
    case 2:
      return "SystemAdmin";
    default:
      throw new Error(`Invalid user role: ${role}`);
  }
}

export const usernameLength: readonly [min: number, max: number] =
  Object.freeze([6, 16]);
export const usernameValidCharacters = Object.freeze(
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_."
);

export const UsernameVerificationFlag = Object.freeze({
  OK: 0,
  InvalidCharacters: 1 << 0,
  InvalidLength: 1 << 1,
  Taken: 1 << 2,
});
