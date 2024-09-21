using System;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

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

    public required byte[] EncryptedChallengeBytes;
    public required byte[] ChallengeBytes;

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

        Aes aesKey = KeyManager.DeserializeSymmetricKey([.. key, .. AesIv]);
        byte[] rsaPrivateKey = KeyManager.Decrypt(aesKey, EncryptedRsaPrivateKey);

        return new()
        {
            Id = Id,
            UserId = UserId,
            Type = Type,
            Iterations = Iterations,
            Salt = Salt,
            AesIv = AesIv,
            RsaPublicKey = RsaPublicKey,
            EncryptedRsaPrivateKey = EncryptedRsaPrivateKey,
            ChallengeBytes = ChallengeBytes,
            EncryptedChallengeBytes = EncryptedChallengeBytes,

            AesKey = payload,
            RsaPrivateKey = rsaPrivateKey,
        };
    }
}

public class UnlockedUserAuthentication : UserAuthentication
{
    public static implicit operator RSA(UnlockedUserAuthentication user) =>
        KeyManager.DeserializeAsymmetricKey(user.RsaPrivateKey);

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

    public async Task<UnlockedUserAuthentication> AddInitialUserAuthentication(
        ResourceTransactionParams transactionParams,
        User user,
        byte[] rsaPublicKey,
        byte[] rsaPrivateKey,
        UserAuthenticationType type,
        byte[] payload
    )
    {
        if (
            await UserAuthentications
                .AsQueryable()
                .Where((userAuthentication) => userAuthentication.UserId == user.Id)
                .ToAsyncEnumerable()
                .AnyAsync(transactionParams.CancellationToken)
        )
        {
            throw new InvalidOperationException("asds");
        }

        int iterations = 10000;

        byte[] salt = new byte[16];
        Data.RandomNumberGenerator.GetBytes(salt);

        byte[] iv = new byte[16];
        Data.RandomNumberGenerator.GetBytes(iv);

        byte[] aesKey = HashPayload(salt, iterations, payload);

        Aes aes = KeyManager.DeserializeSymmetricKey([.. aesKey, .. iv]);

        byte[] encryptedRsaPrivateKey = KeyManager.Encrypt(aes, rsaPrivateKey);

        byte[] challenge = new byte[4096];
        byte[] encryptedChallenge = KeyManager.Encrypt(aes, challenge);

        UserAuthentication userAuthentication =
            new()
            {
                UserId = user.Id,
                Type = type,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = rsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
                ChallengeBytes = challenge,
                EncryptedChallengeBytes = encryptedChallenge,
            };

        await UserAuthentications.InsertOneAsync(
            userAuthentication,
            null,
            transactionParams.CancellationToken
        );

        return (
            new()
            {
                UserId = user.Id,
                Type = UserAuthenticationType.Password,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = rsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
                ChallengeBytes = challenge,
                EncryptedChallengeBytes = encryptedChallenge,
                AesKey = aesKey,
                RsaPrivateKey = rsaPrivateKey,
            }
        );
    }

    public async Task<UnlockedUserAuthentication> AddUserAuthentication(
        ResourceTransactionParams transactionParams,
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

        Aes aes = KeyManager.DeserializeSymmetricKey(aesKey, iv);

        byte[] encryptedRsaPrivateKey = KeyManager.Encrypt(
            aes,
            sourceUserAuthentication.RsaPrivateKey
        );
        byte[] challenge = new byte[4096];
        byte[] encryptedChallenge = KeyManager.Encrypt(aes, challenge);

        UserAuthentication userAuthentication =
            new()
            {
                UserId = user.Id,
                Type = type,
                Iterations = iterations,
                Salt = salt,
                AesIv = iv,
                RsaPublicKey = sourceUserAuthentication.RsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
                ChallengeBytes = challenge,
                EncryptedChallengeBytes = encryptedChallenge,
            };

        await UserAuthentications.InsertOneAsync(
            userAuthentication,
            null,
            transactionParams.CancellationToken
        );

        return new()
        {
            UserId = user.Id,
            Type = type,
            Iterations = iterations,
            Salt = salt,
            AesIv = iv,
            RsaPublicKey = sourceUserAuthentication.RsaPublicKey,
            EncryptedRsaPrivateKey = encryptedRsaPrivateKey,
            AesKey = sourceUserAuthentication.AesKey,
            RsaPrivateKey = sourceUserAuthentication.RsaPrivateKey,
            ChallengeBytes = challenge,
            EncryptedChallengeBytes = encryptedChallenge,
        };
    }

    public async Task RemoveUserAuthentication(
        ResourceTransactionParams transactionParams,
        UnlockedUserAuthentication unlockedUserAuthentication
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
}
