import { authenticateWithPassword, getAuthentication } from '$lib/client/client';
import { ClientConnection } from '@rizzzi/enderdrive-lib/client';
import { UserAuthenticationType } from '@rizzzi/enderdrive-lib/shared';
import { Buffer } from 'buffer';

type TestFunctions = [string, (log: (data: any) => void) => any | Promise<any>][];

const adminUser = 'testuser';
const adminPassword = 'testuser123;';
const adminFirstName = 'Hugh';
const adminMiddleName = 'G';
const adminLastName = 'Rection';

export const testFunctions = ({
  serverFunctions: { echo, getServerStatus, register, updateUser, listUsers, whoAmI }
}: ClientConnection): TestFunctions => [
  ['Hello', () => 'hello'],
  ['World', () => 'world'],
  [
    'Echo',
    async (log) => {
      // const bytes = new Uint8Array(1024 * 1024 * 8);
      // log(`Sending random ${bytes.length} bytes.`);

      // for (let i = 0; i < bytes.length; i++) {
      //   bytes[i] = Math.floor(Math.random() * 256);
      // }

      // log(await echo(bytes));

      const encoder = new TextEncoder();
      const decoder = new TextDecoder();

      log(decoder.decode(await echo(encoder.encode('Hello World!'))));
    }
  ],
  ['Get Server Status', () => getServerStatus()],
  [
    'Get Admin User Credentials',
    () => ({
      username: adminUser,
      password: adminPassword
    })
  ],
  [
    'Register Admin User',
    async () => {
      const user = await register(
        adminUser,
        adminFirstName,
        adminMiddleName,
        adminLastName,
        adminPassword
      );

      return user;
    }
  ],
  [
    'Login As Admin',
    async () => {
      const result = await authenticateWithPassword(adminUser, adminPassword);

      console.log(result);

      return result;
    }
  ],
  [
    'Update User Name',
    () =>
      updateUser({
        firstName: 'Test' + Date.now()
      })
  ],
  ['List Users', () => listUsers()],
  ['Who Am I?', () => whoAmI()]
];
