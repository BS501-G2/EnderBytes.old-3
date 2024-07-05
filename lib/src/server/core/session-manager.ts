import {
  Service,
  ServiceGetDataCallback,
  ServiceReadyCallback,
  ServiceSetDataCallback,
} from "../../shared.js";
import { UnlockedUserAuthentication } from "../db/user-authentication.js";
import { Server } from "./server.js";

export interface SessionData {
  sessions: Map<number, UserSession>;
}

export type SessionOptions = [];

export class UserSession {
  public constructor(
    authentication: UnlockedUserAuthentication,
    onTimeout: () => void
  ) {
    this.authentication = authentication;
    this.#onTimeout = onTimeout;
    this.#timeout = this.refresh();
  }

  readonly authentication: UnlockedUserAuthentication;
  readonly #onTimeout: () => void;
  #timeout: NodeJS.Timeout;

  public refresh(): NodeJS.Timeout {
    clearTimeout(this.#timeout);
    return (this.#timeout = setTimeout(() => this.#onTimeout()));
  }
}

export class SessionManager extends Service<SessionData, SessionOptions> {
  public constructor(server: Server) {
    let getData: ServiceGetDataCallback<SessionData> = null as never;

    super((func) => (getData = func), server);

    this.#getData = getData;
    this.#server = server;
  }

  async run(
    setData: ServiceSetDataCallback<SessionData>,
    onReady: ServiceReadyCallback
  ): Promise<void> {
    const sessions: Map<number, UserSession> = new Map();

    setData({ sessions });

    await new Promise<void>(onReady);
  }

  #getData: ServiceGetDataCallback<SessionData>;
  #server: Server;

  get #data(): SessionData {
    return this.#getData();
  }

  get server(): Server {
    return this.#server;
  }

  get database() {
    return this.server.database;
  }

  get sessions() {
    return this.#data.sessions;
  }

  public getSession(authentication: UnlockedUserAuthentication): UserSession {
    const { sessions } = this;

    let session: UserSession | null =
      sessions.get(authentication.userId) ?? null;

    if (session != null) {
      session.refresh();
      return session;
    }

    sessions.set(
      authentication.userId,
      (session = new UserSession(authentication, () =>
        sessions.delete(authentication.userId)
      ))
    );

    return session;
  }
}
