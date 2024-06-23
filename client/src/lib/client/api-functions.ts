import type { Authentication } from '$lib/shared/api';
import type { UpdateUserOptions, User, UserManager } from '$lib/server/db/user';
import type { UnlockedUserKey } from '$lib/server/db/user-key';
import type { QueryOptions } from '$lib/server/db';

import { persisted } from 'svelte-persisted-store';
import { derived, get, type Writable } from 'svelte/store';
import { clientSideInvoke } from './api';
import { FileAccessLevel, UserKeyType, UserRole } from '$lib/shared/db';
import { BSON } from 'bson';
import { bytesToBase64, base64ToBytes } from 'byte-base64';
import type { File } from '$lib/server/db/file';
import type { FileSnapshot } from '$lib/server/db/file-snapshot';
import type { FileContent } from '$lib/server/db/file-content';
import type { FileAccess } from '$lib/server/db/file-access';

const authentication: Writable<Authentication | null> = persisted('authentication', null, {
  serializer: {
    stringify: (value) => bytesToBase64(BSON.serialize({ data: value })),
    parse: (json) => BSON.deserialize(base64ToBytes(json)).data
  }
});

const readonlyAuthentication = derived(authentication, (value) => {
  if (value == null) {
    return null;
  }

  return value;
});

export { readonlyAuthentication as authentication };

export async function authenticateByPassword(
  username: string,
  password: string
): Promise<Authentication> {
  const result = await clientSideInvoke(
    'authenticate',
    username,
    UserKeyType.Password,
    new TextEncoder().encode(password)
  );

  authentication.set(result);
  return result;
}

export function getAuthentication(): Authentication | null {
  return get(authentication);
}

export async function getAndVerifyAuthentication(): Promise<Authentication | null> {
  const value = getAuthentication();
  if (value == null) {
    return null;
  }

  if (!(await clientSideInvoke('validateAuthentication', value))) {
    authentication.set(null);

    return null;
  }

  return getAuthentication();
}

export function clearAuthentication(): void {
  authentication.set(null);
}

export async function getServerStatus() {
  return await clientSideInvoke('getServerStatus');
}

export async function createAdminUser(
  username: string,
  firstName: string,
  middleName: string | null,
  lastName: string,
  password: string
): Promise<User> {
  return await clientSideInvoke(
    'createAdminUser',
    username,
    firstName,
    middleName,
    lastName,
    password
  );
}

export async function listUsers(options?: QueryOptions<UserManager, User>): Promise<User[]> {
  return await clientSideInvoke('listUsers', getAuthentication(), options);
}

export async function getUser(id: number | string): Promise<User | null> {
  return await clientSideInvoke('getUser', getAuthentication(), id);
}

export async function createUser(
  username: string,
  firstName: string,
  middleName: string | null,
  lastName: string,
  role: UserRole
): Promise<[user: User, unlockedUserKey: UnlockedUserKey, password: string]> {
  return await clientSideInvoke(
    'createUser',
    getAuthentication(),
    username,
    firstName,
    middleName,
    lastName,
    role
  );
}

export async function updateUser(id: number, newData: UpdateUserOptions) {
  return await clientSideInvoke('updateUser', getAuthentication(), id, newData);
}

export async function createFile(parentFolder: File, name: string, content: Uint8Array) {
  return await clientSideInvoke('createFile', getAuthentication(), parentFolder.id, name, content);
}

export async function createFolder(parentFolder: File, name: string) {
  return await clientSideInvoke('createFolder', getAuthentication(), parentFolder.id, name);
}

export async function scanFolder(folder: File) {
  return await clientSideInvoke('scanFolder', getAuthentication(), folder.id);
}

export async function listPathChain(file: File): Promise<File[]> {
  return await clientSideInvoke('listPathChain', getAuthentication(), file.id);
}

export async function listFileAccess(file: File) {
  return await clientSideInvoke('listFileAccess', getAuthentication(), file.id);
}

export async function listSharedFiles() {
  return await clientSideInvoke('listSharedFiles', getAuthentication());
}

export async function getFile(fileId: number | null) {
  return await clientSideInvoke('getFile', getAuthentication(), fileId);
}

export async function listFileSnapshots(fileContent: FileContent): Promise<FileSnapshot[]> {
  return await clientSideInvoke('listFileSnapshots', getAuthentication(), fileContent.id);
}

export async function getFileSize(file: File): Promise<number> {
  return await clientSideInvoke('getFileSize', getAuthentication(), file.id);
}

export async function readFile(file: File, offset?: number, length?: number): Promise<Uint8Array> {
  return await clientSideInvoke('readFile', getAuthentication(), file.id, offset, length);
}

export async function moveFile(files: File[], destinationFolder: File) {
  return await clientSideInvoke(
    'moveFile',
    getAuthentication(),
    files.map((file) => file.id),
    destinationFolder.id
  );
}

export async function getFileMimeType(file: File, mime?: boolean): Promise<string> {
  return await clientSideInvoke('getFileMimeType', getAuthentication(), file.id, mime);
}

export async function searchUser(searchString: string): Promise<User[]> {
  return await clientSideInvoke('searchUser', getAuthentication(), searchString);
}

export async function grantAccessToUser(
  file: File,
  targetUser: User,
  type: FileAccessLevel
): Promise<FileAccess> {
  return await clientSideInvoke(
    'grantAccessToUser',
    getAuthentication(),
    file.id,
    targetUser.id,
    type
  );
}

export async function revokeAccessFromUser(file: File, targetUser: User) {
  return await clientSideInvoke(
    'revokeAccessFromUser',
    getAuthentication(),
    file.id,
    targetUser.id
  );
}
