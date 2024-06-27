import { Knex } from "knex";
import { Resource } from "../../shared/db.js";
import { userSessionExpiryDuration } from "../../shared/db/user-session.js";
import { decryptSymmetric, encryptSymmetric, randomBytes } from "../crypto.js";
import { Database } from "../database.js";
import { ResourceManager } from "../resource.js";
import {
  UnlockedUserAuthentication,
  UserAuthentication,
  UserAuthenticationManager,
} from "./user-authentication.js";
import { UserManager } from "./user.js";

export interface UserSessionResource
  extends Resource<UserSessionResource, UserSessionManager> {
  expireTime: number;
  userId: number;
  originUserAuthenticationId: number;

  encryptedPrivateKey: Uint8Array;
  encrypterPrivateKeyIv: Uint8Array;
  encrypterPrivateKeyAuthTag: Uint8Array;
}

export interface UnlockedUserSession extends UserSessionResource {
  unlockedKey: Uint8Array;
  privateKey: Uint8Array;
}

export class UserSessionManager extends ResourceManager<
  UserSessionResource,
  UserSessionManager
> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "UserSession", 1);
  }

  protected get ftsColumns(): (keyof UserSessionResource)[] {
    return [];
  }

  protected async upgrade(
    table: Knex.AlterTableBuilder,
    oldVersion: number = 0
  ): Promise<void> {
    if (oldVersion < 1) {
      table.integer("expireTime").notNullable();
      table
        .integer("userId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserManager).recordTableName)
        .onDelete("cascade");
      table
        .integer("originUserAuthenticationId")
        .notNullable()
        .references("id")
        .inTable(this.getManager(UserAuthenticationManager).recordTableName)
        .onDelete('cascade');

      table.binary("encryptedPrivateKey").notNullable();
      table.binary("encrypterPrivateKeyIv").notNullable();
      table.binary("encrypterPrivateKeyAuthTag").notNullable();
    }
  }

  public async create(
    unlockedUserKey: UnlockedUserAuthentication,
    expireDuration: number = userSessionExpiryDuration
  ): Promise<UnlockedUserSession> {
    const [key, iv] = await Promise.all([randomBytes(32), randomBytes(16)]);

    const [authTag, encryptedPrivateKey] = encryptSymmetric(
      key,
      iv,
      unlockedUserKey.privateKey
    );

    const userSession = await this.insert({
      expireTime: Date.now() + expireDuration,
      userId: unlockedUserKey.userId,
      originUserAuthenticationId: unlockedUserKey.id,

      encryptedPrivateKey,
      encrypterPrivateKeyIv: iv,
      encrypterPrivateKeyAuthTag: authTag,
    });

    return {
      ...userSession,

      unlockedKey: key,
      privateKey: unlockedUserKey.privateKey,
    };
  }

  public unlock(
    userSession: UserSessionResource,
    key: Uint8Array
  ): UnlockedUserSession {
    return {
      ...userSession,

      unlockedKey: key,
      privateKey: decryptSymmetric(
        key,
        userSession.encrypterPrivateKeyIv,
        userSession.encryptedPrivateKey,
        userSession.encrypterPrivateKeyAuthTag
      ),
    };
  }

  public unlockKey(
    userSession: UnlockedUserSession,
    userAuthentication: UserAuthentication
  ): UnlockedUserAuthentication {
    return {
      ...userAuthentication,

      privateKey: userSession.privateKey,
    };
  }
}
