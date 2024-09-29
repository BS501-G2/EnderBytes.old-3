import { Resource } from "../resource.js";

export type UserSessionType = "browser" | "sync-app";

export interface UserSessionResource extends Resource {
  expireTime: number;
  userId: number;
  originUserAuthenticationId: number;

  encryptedPrivateKey: Uint8Array;
  encrypterPrivateKeyIv: Uint8Array;
  encrypterPrivateKeyAuthTag: Uint8Array;

  type: UserSessionType;
}

export interface UnlockedUserSession extends UserSessionResource {
  key: Uint8Array;
  privateKey: Uint8Array;
}

export const userSessionExpiryDuration = 30 * 24 * 60 * 60 * 1000;
