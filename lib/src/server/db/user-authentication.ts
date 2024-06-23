import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { UserAuthenticationType } from "../../shared/db/user-key.js";
import { Database } from "../database.js";
import { ResourceManager } from "../resource.js";
import {
  decryptAsymmetric,
  decryptSymmetric,
  encryptAsymmetric,
  encryptSymmetric,
  generateKeyPair,
  hashPayload,
  randomBytes,
} from "../crypto.js";
import { UserResource } from "./user.js";

export interface UserAuthentication
  extends Resource<UserAuthentication, UserAuthenticationManager> {
  userId: number;
  type: UserAuthenticationType;
  iterations: number;
  salt: Uint8Array;
  iv: Uint8Array;
  encryptedAuthTag: Uint8Array;

  encryptedPrivateKey: Uint8Array;
  publicKey: Uint8Array;
}

export interface UnlockedUserKey extends UserAuthentication {
  unlockedPrivateKey: Uint8Array;
}

export class UserAuthenticationManager extends ResourceManager<
  UserAuthentication,
  UserAuthenticationManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "UserKey", 1);
  }

  get searchableColumns(): (keyof UserAuthentication)[] {
    return [];
  }

  protected async upgrade(
    table: Knex.TableBuilder,
    oldVersion: number = 0
  ): Promise<void> {
    if (oldVersion < 1) {
      table.integer("userId").notNullable();
      table.integer("type").notNullable();

      table.integer("iterations").notNullable();
      table.string("salt").notNullable();
      table.string("iv").notNullable();

      table.binary("encryptedPrivateKey").notNullable();
      table.binary("authTag").notNullable();
      table.binary("publicKey").notNullable();
    }
  }

  public async create(
    user: UserResource,
    type: UserAuthenticationType,
    payload: Uint8Array
  ): Promise<UnlockedUserKey> {
    const [[privateKey, publicKey], salt, iv] = await Promise.all([
      generateKeyPair(),
      randomBytes(32),
      randomBytes(16),
    ]);
    const key = await hashPayload(payload, salt);
    const [encryptedAuthTag, encryptedPrivateKey] = await encryptSymmetric(
      key,
      iv,
      privateKey
    );

    const userKey = await this.insert({
      userId: user.dataId,
      type,

      iterations: 10000,
      salt,
      iv,

      encryptedPrivateKey,
      encryptedAuthTag,
      publicKey,
    });

    const unlocked = this.unlock(userKey, payload);
    return unlocked;
  }

  public list(
    user: UserResource,
    filterType?: UserAuthenticationType
  ): AsyncGenerator<UserAuthentication> {
    return this.read({
      where: [
        filterType != null ? ["type", "=", filterType] : null,
        ["userId", "=", user.dataId],
      ],
    });
  }

  public async findByPayload(
    user: UserResource,
    type: UserAuthenticationType,
    payload: Uint8Array
  ): Promise<UnlockedUserKey | null> {
    for await (const key of this.list(user, type)) {
      try {
        const unlocked = await this.unlock(key, payload);

        if (unlocked != null) {
          return unlocked;
        }
      } catch (error: unknown) {
        continue;
      }
    }

    return null;
  }

  public async unlock(
    key: UserAuthentication,
    payload: Uint8Array
  ): Promise<UnlockedUserKey> {
    const privateKey = decryptSymmetric(
      await hashPayload(payload, key.salt),

      key.iv,
      key.encryptedPrivateKey,
      key.encryptedAuthTag
    );

    return {
      ...key,
      unlockedPrivateKey: privateKey,
    };
  }

  public async setPassword(
    user: UserResource,
    oldPassword: string,
    newPassword: string
  ): Promise<UnlockedUserKey> {
    for await (const userAuthentication of this.list(
      user,
      UserAuthenticationType.Password
    )) {
      let unlockedUserKey: UnlockedUserKey;
      try {
        unlockedUserKey = await this.unlock(
          userAuthentication,
          new TextEncoder().encode(oldPassword)
        );
      } catch {
        throw new Error("Wrong password");
      }

      const newKey = await hashPayload(
        new TextEncoder().encode(newPassword),
        unlockedUserKey.salt
      );
      const [encryptedAuthTag, encryptedPrivateKey] = encryptSymmetric(
        newKey,
        unlockedUserKey.iv,
        unlockedUserKey.unlockedPrivateKey
      );

      const newUserKey = await this.update(userAuthentication, {
        encryptedPrivateKey,
        encryptedAuthTag,
      });

      return this.unlock(newUserKey, new TextEncoder().encode(newPassword));
    }

    throw new Error("User has no password");
  }

  public decrypt(key: UnlockedUserKey, payload: Uint8Array): Uint8Array {
    return decryptAsymmetric(key.unlockedPrivateKey, payload);
  }

  public encrypt(key: UserAuthentication, payload: Uint8Array): Uint8Array {
    return encryptAsymmetric(key.publicKey, payload);
  }
}
