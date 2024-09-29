import type { Knex } from "knex";
import {
  UserResource,
  UserRole,
  UsernameVerificationFlag,
  serializeUserRole,
  usernameLength,
  usernameValidCharacters,
} from "../../shared/db/user.js";
import { ResourceManager } from "../resource.js";
import { UserAuthenticationManager } from "./user-authentication.js";
import { Database } from "../database.js";
import { UnlockedUserAuthentication } from "../../shared/db/user-authentication.js";

export class UserManager extends ResourceManager<UserResource, UserManager> {
  public constructor(
    db: Database,
    init: (onInit: (version?: number) => Promise<void>) => void
  ) {
    super(db, init, "User", 1);
  }

  get searchableColumns(): (keyof UserResource)[] {
    return ["lastName", "middleName", "firstName", "username"];
  }

  protected async upgrade(
    table: Knex.AlterTableBuilder,
    oldVersion: number = 0
  ): Promise<void> {
    if (oldVersion < 1) {
      table.string("username").collate("nocase");
      table.string("firstName").notNullable();
      table.string("middleName").nullable();
      table.string("lastName").notNullable();
      table.integer("role").notNullable();
      table.boolean("isSuspended").notNullable();
    }
  }

  public readonly randomPasswordMap: string =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789;,./<>?`~!@#$%^&*()_+-=[]{}|\\:"';

  public generateRandomPassword(length: number): string {
    let password = "";
    for (let i = 0; i < length; i++) {
      password +=
        this.randomPasswordMap[
          Math.floor(Math.random() * this.randomPasswordMap.length)
        ];
    }
    return password;
  }

  public async verify(
    username: string,
    checkExisting: boolean = true
  ): Promise<number> {
    let flag: number = UsernameVerificationFlag.OK;

    const [min, max] = usernameLength;

    if (username.length < min || username.length > max) {
      flag |= UsernameVerificationFlag.InvalidLength;
    }

    if (!username.match(new RegExp(`^[${usernameValidCharacters}]+$`, "g"))) {
      flag |= UsernameVerificationFlag.InvalidCharacters;
    }

    if (checkExisting) {
      if ((await this.count([["username", "=", username]])) > 0) {
        flag |= UsernameVerificationFlag.Taken;
      }
    }

    return flag;
  }

  public async create(
    username: string,
    firstName: string,
    middleName: string | null,
    lastName: string,
    password: string = this.generateRandomPassword(16),
    role: UserRole = "Member"
  ): Promise<
    [
      user: UserResource,
      unlockedUserKey: UnlockedUserAuthentication,
      password: string
    ]
  > {
    if ((await this.verify(username)) !== UsernameVerificationFlag.OK) {
      throw new Error("Invalid username");
    }

    const user = await this.insert({
      username,
      firstName,
      middleName,
      lastName,
      role: serializeUserRole(role),
      isSuspended: false,
    });

    const [userKeyManager] = this.getManagers(UserAuthenticationManager);

    const userKey = await userKeyManager.create(
      user,
      "password",
      new TextEncoder().encode(password)
    );

    return [user, userKey, password];
  }

  public async delete(user: UserResource) {
    await super.delete(user);

    const [userKeyManager] = this.getManagers(UserAuthenticationManager);
    await userKeyManager.deleteWhere([["userId", "=", user.dataId]]);
  }

  public async purge(data: UserResource): Promise<void> {
    await super.purge(data);

    const [userKeyManager] = this.getManagers(UserAuthenticationManager);
    await userKeyManager.purgeWhere([["userId", "=", data.dataId]]);
  }

  public async getByUsername(username: string): Promise<UserResource | null> {
    if ((await this.verify(username, false)) !== UsernameVerificationFlag.OK) {
      return null;
    }

    for await (const user of this.readStream({
      where: [["username", "=", username]],
      limit: 1,
    })) {
      return user;
    }

    return null;
  }

  public async update(
    oldUser: UserResource,
    user: UpdateUserOptions
  ): Promise<UserResource> {
    const { username } = user;

    if (username != null) {
      const usernameVerification = await this.verify(username);

      if (usernameVerification !== UsernameVerificationFlag.OK) {
        throw new Error("Invalid username");
      }
    }

    return await super.update(oldUser, user);
  }

  public async setSuspended(
    user: UserResource,
    isSuspended: boolean = true
  ): Promise<UserResource> {
    return await super.update(user, { isSuspended });
  }
}

export interface UpdateUserOptions extends Partial<UserResource> {
  username?: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  keyRole?: UserRole;
}
