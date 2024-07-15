import { ClientConnection } from '@rizzzi/enderdrive-lib/client';
import { get, writable, derived, type Writable } from 'svelte/store';
import {
  UserAuthenticationType,
  UserResolveType,
  type Authentication
} from '@rizzzi/enderdrive-lib/shared';
import { persisted } from 'svelte-persisted-store';
import { Buffer } from 'buffer';

const authentication: Writable<Authentication | null> = persisted(
  'auth',
  null as Authentication | null
);

const readonlyAuthentication = derived(authentication, (value) => value);

export function clearAuthentication() {
  authentication.set(null);
}

export function getAuthentication(): Authentication | null {
  return get(authentication);
}

export async function getAndValidateAuthentication(): Promise<Authentication | null> {
  const {
    serverFunctions: { isAuthenticationValid }
  } = getConnection();

  const authentication = getAuthentication();

  if (authentication == null || !(await isAuthenticationValid(authentication))) {
    return null;
  }

  return authentication;
}

export async function authenticateWithPassword(username: string, password: string) {
  const {
    serverFunctions: { authenticate }
  } = getConnection();

  const result = await authenticate(
    [UserResolveType.Username, username],
    UserAuthenticationType.Password,
    Buffer.from(password, 'utf-8')
  );

  authentication.set(result);
  return result;
}

export { readonlyAuthentication as authentication };

const connection = writable<ClientConnection | null>(null);

export function getConnection() {
  let client = get(connection);

  if (client == null) {
    connection.set((client = new ClientConnection(() => get(authentication), authentication.set)));
  }

  return client;
}
