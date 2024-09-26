using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using System.Collections.Generic;
using System.Linq;
using Services;

public enum UserAuthenticationType
{
    Password,
    Google,
}

public class UserAuthentication : ResourceData
{
    public static implicit operator RSA(UserAuthentication user) =>
        KeyManager.DeserializeAsymmetricKey(user.RsaPublicKey);

    public required ObjectId UserId;
    public required UserAuthenticationType Type;

    public required int Iterations;
    public required byte[] Salt;
    public required byte[] AesIv;

    public required byte[] RsaPublicKey;
    public required byte[] EncryptedRsaPrivateKey;

    public UnlockedUserAuthentication Unlock(UnlockedUserAuthentication userAuthentication) =>
        Unlock(userAuthentication.Payload);

    public UnlockedUserAuthentication Unlock(string payload) =>
        Unlock(Encoding.UTF8.GetBytes(payload));

    public UnlockedUserAuthentication Unlock(byte[] payload)
    {
        byte[] key;
        {
            using Rfc2898DeriveBytes rfc2898DeriveBytes =
                new(payload, Salt, Iterations, HashAlgorithmName.SHA256);

            key = rfc2898DeriveBytes.GetBytes(32);
        }

        using Aes aesKey = KeyManager.DeserializeSymmetricKey([.. key, .. AesIv]);
        byte[] rsaPrivateKey = KeyManager.Decrypt(aesKey, EncryptedRsaPrivateKey);

        return new()
        {
            Original = this,

            Id = Id,
            UserId = UserId,
            Type = Type,
            Iterations = Iterations,
            Salt = Salt,
            AesIv = AesIv,
            RsaPublicKey = RsaPublicKey,
            EncryptedRsaPrivateKey = EncryptedRsaPrivateKey,

            Payload = payload,
            AesKey = payload,
            RsaPrivateKey = rsaPrivateKey,
        };
    }
}

public class UnlockedUserAuthentication : UserAuthentication
{
    public static implicit operator RSA(UnlockedUserAuthentication user) =>
        KeyManager.DeserializeAsymmetricKey(user.RsaPrivateKey);

    public required UserAuthentication Original;

    public required byte[] Payload;
    public required byte[] AesKey;
    public required byte[] RsaPrivateKey;
}

public sealed partial class ResourceManager
{
    private IMongoCollection<UserAuthentication> UserAuthentications =>
        GetCollection<UserAuthentication>();

    private static byte[] HashPayload(byte[] salt, int iterations, byte[] payload)
    {
        using Rfc2898DeriveBytes rfc2898DeriveBytes =
            new(payload, salt, iterations, HashAlgorithmName.SHA256);

        return rfc2898DeriveBytes.GetBytes(32);
    }

    private async Task<UnlockedUserAuthentication> AddInitialUserAuthentication(
        ResourceTransaction transactionParams,
        User user,
        UserAuthenticationType type,
        byte[] payload,
        byte[] rsaPublicKey,
        byte[] rsaPrivateKey
    )
    {
        int iterations = 10000;

        byte[] salt = new byte[16];
        Data.RandomNumberGenerator.GetBytes(salt);

        byte[] iv = new byte[16];
        Data.RandomNumberGenerator.GetBytes(iv);

        byte[] aesKey = HashPayload(salt, iterations, payload);

        using Aes aes = KeyManager.DeserializeSymmetricKey([.. aesKey, .. iv]);

        byte[] encryptedRsaPrivateKey = KeyManager.Encrypt(aes, rsaPrivateKey);

        byte[] challenge = RandomNumberGenerator.GetBytes(4 * 1024);
        byte[] encryptedChallenge = KeyManager.Encrypt(aes, challenge);

        UserAuthentication userAuthentication =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                UserId = user.Id,
                Type = type,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = rsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
            };

        await UserAuthentications.InsertOneAsync(
            userAuthentication,
            null,
            transactionParams.CancellationToken
        );

        return (
            new()
            {
                Original = userAuthentication,
                Id = userAuthentication.Id,
                UserId = user.Id,
                Type = UserAuthenticationType.Password,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = rsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
                Payload = payload,
                AesKey = aesKey,
                RsaPrivateKey = rsaPrivateKey,
            }
        );
    }

    public async Task<UnlockedUserAuthentication> AddUserAuthentication(
        ResourceTransaction transactionParams,
        User user,
        UnlockedUserAuthentication sourceUserAuthentication,
        UserAuthenticationType type,
        byte[] payload
    )
    {
        int iterations = 10000;

        byte[] salt = new byte[16];
        Data.RandomNumberGenerator.GetBytes(salt);

        byte[] iv = new byte[16];
        Data.RandomNumberGenerator.GetBytes(iv);

        byte[] aesKey = HashPayload(salt, iterations, payload);

        using Aes aes = KeyManager.DeserializeSymmetricKey(aesKey, iv);

        byte[] encryptedRsaPrivateKey = KeyManager.Encrypt(
            aes,
            sourceUserAuthentication.RsaPrivateKey
        );

        UserAuthentication userAuthentication =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                UserId = user.Id,
                Type = type,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = sourceUserAuthentication.RsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
            };

        await UserAuthentications.InsertOneAsync(
            userAuthentication,
            null,
            transactionParams.CancellationToken
        );

        return new()
        {
            Original = userAuthentication,
            Id = userAuthentication.Id,
            UserId = user.Id,
            Type = type,
            Iterations = iterations,
            Salt = salt,
            AesIv = iv,
            RsaPublicKey = sourceUserAuthentication.RsaPublicKey,
            EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
            AesKey = sourceUserAuthentication.AesKey,
            RsaPrivateKey = sourceUserAuthentication.RsaPrivateKey,
            Payload = payload,
        };
    }

    private async Task RemoveUserAuthentication(
        ResourceTransaction transactionParams,
        UnlockedUserAuthentication unlockedUserAuthentication,
        bool forceDelete = false
    )
    {
        if (
            await UserAuthentications
                .AsQueryable()
                .Where(
                    (userAuthentication) =>
                        userAuthentication.UserId == unlockedUserAuthentication.UserId
                )
                .ToAsyncEnumerable()
                .CountAsync(transactionParams.CancellationToken) <= 1
            && !forceDelete
        )
        {
            throw new InvalidOperationException(
                "Removing the last user authentication is not allowed"
            );
        }

        await UserAuthentications.DeleteManyAsync(
            (userAuthentication) => userAuthentication.Id == unlockedUserAuthentication.Id,
            null,
            transactionParams.CancellationToken
        );
    }

    public Task RemoveUserAuthentication(
        ResourceTransaction transactionParams,
        UnlockedUserAuthentication unlockedUserAuthentication
    ) => RemoveUserAuthentication(transactionParams, unlockedUserAuthentication, false);

    public IAsyncEnumerable<UserAuthentication> GetUserAuthentications(
        ResourceTransaction transaction,
        User? user = null,
        UserAuthenticationType? type = null
    ) =>
        Query<UserAuthentication>(
            transaction,
            (query) =>
                query.Where(
                    (item) =>
                        (user == null || user.Id == item.UserId)
                        && (type == null || type == item.Type)
                )
        );
}
