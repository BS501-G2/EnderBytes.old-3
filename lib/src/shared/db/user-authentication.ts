import { Resource } from "../resource.js";

export interface UserAuthentication extends Resource {
  userId: number;
  type: UserAuthenticationType;
  iterations: number;
  salt: Uint8Array;
  iv: Uint8Array;
  encryptedPrivateKeyAuthTag: Uint8Array;

  encryptedPrivateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface UnlockedUserAuthentication extends UserAuthentication {
  privateKey: Uint8Array;
}

export type UserAuthenticationType = "password" | "session";
