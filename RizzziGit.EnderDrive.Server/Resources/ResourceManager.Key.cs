using System.Security.Cryptography;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using System;
using System.Linq;
using Services;

public class Key : ResourceData;

public class KeyAccess : ResourceData
{
    public required ObjectId KeyId;
    public required ObjectId UserId;

    public required byte[] EncryptedAesKey;

    public UnlockedKeyAccess Unlock(UnlockedUserAuthentication userAuthentication)
    {
        if (UserId != userAuthentication.UserId)
        {
            throw new InvalidOperationException("User ID mismatch");
        }

        byte[] aesKey = KeyManager.Decrypt(userAuthentication, EncryptedAesKey);

        return new()
        {
            KeyId = KeyId,
            UserId = UserId,
            EncryptedAesKey = EncryptedAesKey,

            AesKey = aesKey,
        };
    }
}

public class UnlockedKeyAccess : KeyAccess
{
    public required byte[] AesKey;
}

public sealed partial class ResourceManager
{
    private IMongoCollection<Key> Keys => GetCollection<Key>();
    private IMongoCollection<KeyAccess> KeyAccesses => GetCollection<KeyAccess>();

    public async Task<(Key Key, KeyAccess KeyAccess)> CreateKey(
        ResourceTransactionParams transactionParams,
        User user
    )
    {
        Key key = new();

        await Keys.InsertOneAsync(key, null, transactionParams.CancellationToken);

        return (key, await AddInitialKeyAccess(transactionParams, key, user));
    }

    public async Task<UnlockedKeyAccess> AddInitialKeyAccess(
        ResourceTransactionParams transactionParams,
        Key key,
        User user
    )
    {
        if (
            await KeyAccesses
                .AsQueryable()
                .Where((e) => e.KeyId == key.Id)
                .ToAsyncEnumerable()
                .AnyAsync(transactionParams.CancellationToken)
        )
        {
            throw new InvalidOperationException("Key has already been generated");
        }

        Aes aes = await KeyManager.GenerateSymmetricKey(transactionParams.CancellationToken);

        byte[] aesKey = KeyManager.SerializeSymmetricKey(aes);
        byte[] encryptedAesKey = KeyManager.Encrypt(user, aesKey);

        KeyAccess keyAccess =
            new()
            {
                KeyId = key.Id,
                UserId = user.Id,
                EncryptedAesKey = encryptedAesKey,
            };

        await KeyAccesses.InsertOneAsync(keyAccess, null, transactionParams.CancellationToken);

        return new()
        {
            KeyId = key.Id,
            UserId = user.Id,
            EncryptedAesKey = encryptedAesKey,

            AesKey = aesKey,
        };
    }

    public async Task<UnlockedKeyAccess> AddKeyAccess(
        ResourceTransactionParams transactionParams,
        Key key,
        UnlockedKeyAccess sourceKeyAccess,
        User user
    )
    {
        if (key.Id != sourceKeyAccess.KeyId)
        {
            throw new InvalidOperationException("Key ID mismatch");
        }

        if (
            await KeyAccesses
                .AsQueryable()
                .Where((keyAccess) => keyAccess.KeyId == key.Id && keyAccess.UserId == user.Id)
                .ToAsyncEnumerable()
                .AnyAsync(transactionParams.CancellationToken)
        )
        {
            throw new InvalidOperationException("User already has access to key");
        }

        Aes aes = KeyManager.DeserializeSymmetricKey(sourceKeyAccess.AesKey);
        byte[] encryptedAesKey = KeyManager.Encrypt(user, sourceKeyAccess.AesKey);

        KeyAccess keyAccess =
            new()
            {
                KeyId = key.Id,
                UserId = user.Id,
                EncryptedAesKey = encryptedAesKey,
            };

        await KeyAccesses.InsertOneAsync(keyAccess, null, transactionParams.CancellationToken);

        return new()
        {
            KeyId = key.Id,
            UserId = user.Id,
            EncryptedAesKey = encryptedAesKey,

            AesKey = aes.Key,
        };
    }

    public async Task RemoveKeyAccess(
        ResourceTransactionParams transactionParams,
        UnlockedKeyAccess unlockedKeyAccess
    )
    {
        if (
            await KeyAccesses
                .AsQueryable()
                .Where((keyAccess) => keyAccess.KeyId == unlockedKeyAccess.KeyId)
                .ToAsyncEnumerable()
                .CountAsync(transactionParams.CancellationToken) <= 1
        )
        {
            throw new InvalidOperationException("Removing the last key access is not allowed");
        }

        await KeyAccesses.DeleteManyAsync((keyAccess) => keyAccess.Id == unlockedKeyAccess.Id);
    }
}
