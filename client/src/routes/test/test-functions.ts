import { authenticateWithPassword, getAuthentication } from '$lib/client/client';
import { ClientConnection } from '@rizzzi/enderdrive-lib/client';
import { UserAuthenticationType, UserRole } from '@rizzzi/enderdrive-lib/shared';
import { Buffer } from 'buffer';

type TestFunctions = [string, (log: (data: any) => void) => any | Promise<any>][];

const adminUser = 'testuser';
const adminPassword = 'testuser123;';
const adminFirstName = 'Test';
const adminMiddleName = 'Test';
const adminLastName = 'Test';

export const testFunctions = ({
  serverFunctions: { echo, getServerStatus, register, updateUser, listUsers, whoAmI, createUser }
}: ClientConnection): TestFunctions => [
  ['Hello', () => 'hello'],
  ['World', () => 'world'],
  [
    'Echo',
    async (log) => {
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

      return result;
    }
  ],
  [
    'Create Test User',
    async () => {
      const result = await createUser(
        'testtest2',
        'Test',
        'Test',
        'Test',
        'test',
        UserRole.Member
      );

      return result;
    }
  ],
  [
    'Login as Test User',
    async () => {
      const result = await authenticateWithPassword('testtest2', 'test');
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
