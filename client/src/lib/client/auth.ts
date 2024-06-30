import { derived, get, writable, type Writable } from 'svelte/store';
import { UserAuthenticationType, type Authentication } from '@rizzzi/enderdrive-lib/shared';
import { persisted } from 'svelte-persisted-store';
import { Buffer } from 'buffer';
import { BSON } from 'bson';
import { getConnection } from '@rizzzi/enderdrive-lib/client';

const authentication: Writable<Authentication | null> = persisted(
  'auth',
  null as Authentication | null,
  {
    serializer: {
      parse: (data: string) => {
        const buffer = Buffer.from(data, 'base64');

        if (buffer.length === 0) {
          return null;
        } else {
          const deserialized = BSON.deserialize(buffer) as Authentication;

          try {
            const d = Object.assign(deserialized, {
              userSessionKey: new Uint8Array(Buffer.from(deserialized.userSessionKey as never, 'base64'))
            });

            console.log(d);
            return d;
          } catch {
            return null;
          }
        }
      },
      stringify: (data) =>
        (data == null
          ? Buffer.alloc(0)
          : Buffer.from(
              BSON.serialize(
                Object.assign(data, {
                  userSessionKey: Buffer.from(data.userSessionKey).toString('base64')
                })
              )
            )
        ).toString('base64')
    }
  }
);

const readonlyAuthentication = derived(authentication, (value) => value);

export function clearAuthentication() {
  authentication.set(null);
}

export function getAuthentication(): Authentication | null {
  return get(authentication);
}

export async function getAndValidateAuthentication(): Promise<Authentication | null> {
  const authentication = getAuthentication();

  const {
    funcs: { isAuthenticationValid }
  } = getConnection();

  if (authentication == null || !(await isAuthenticationValid(authentication))) {
    return null;
  }

  return authentication;
}

export async function authenticateWithPassword(username: string, password: string) {
  const {
    funcs: { authenticate }
  } = getConnection();

  const result = await authenticate(
    username,
    UserAuthenticationType.Password,
    Buffer.from(password, 'utf-8')
  );

  authentication.set(result);
  return result;
}

export { readonlyAuthentication as authentication };
