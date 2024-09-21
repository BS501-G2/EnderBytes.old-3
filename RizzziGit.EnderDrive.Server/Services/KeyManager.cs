using System.IO;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;

namespace RizzziGit.EnderDrive.Server.Services;

using System;
using Commons.Collections;
using Commons.Services;
using Core;

public sealed class KeyGeneratorParams
{
    public required WaitQueue<RSA> AsymmetricKeys;
    public required WaitQueue<Aes> SymmetricKeys;
}

public sealed class KeyManager(Server server) : Service2<KeyGeneratorParams>("Key Manager", server)
{
    private static async Task RunAsymmetricKeyGenerator(
        WaitQueue<RSA> queue,
        CancellationToken cancellationToken
    )
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            RSA key = RSA.Create(2048);

            await queue.Enqueue(key, cancellationToken);
        }
    }

    private static async Task RunSymmetricKeyGenerator(
        WaitQueue<Aes> queue,
        CancellationToken cancellationToken
    )
    {
        while (true)
        {
            cancellationToken.ThrowIfCancellationRequested();

            Aes key = Aes.Create();
            key.KeySize = 256;

            key.GenerateKey();
            key.GenerateIV();

            await queue.Enqueue(key, cancellationToken);
        }
    }

    protected override Task<KeyGeneratorParams> OnStart(CancellationToken cancellationToken)
    {
        WaitQueue<RSA> asymmetricKeys = new(1000);
        WaitQueue<Aes> symmetricKeys = new(1000);

        return Task.FromResult<KeyGeneratorParams>(
            new() { AsymmetricKeys = asymmetricKeys, SymmetricKeys = symmetricKeys }
        );
    }

    protected override async Task OnRun(
        KeyGeneratorParams data,
        CancellationToken cancellationToken
    ) =>
        await await Task.WhenAny(
            [
                Task.Run(
                    () => RunAsymmetricKeyGenerator(data.AsymmetricKeys, cancellationToken),
                    CancellationToken.None
                ),
                Task.Run(
                    () => RunSymmetricKeyGenerator(data.SymmetricKeys, cancellationToken),
                    CancellationToken.None
                ),
            ]
        );

    public Task<RSA> GenerateAsymmetricKey(CancellationToken cancellationToken = default) =>
        Data.AsymmetricKeys.Dequeue(cancellationToken);

    public Task<Aes> GenerateSymmetricKey(CancellationToken cancellationToken = default) =>
        Data.SymmetricKeys.Dequeue(cancellationToken);

    public static byte[] SerializeAsymmetricKey(RSA key, bool includePrivate)
    {
        RSAParameters keyParameters = key.ExportParameters(includePrivate);

        using MemoryStream stream = new();
        using BsonWriter bsonWriter = new BsonBinaryWriter(stream);

        BsonSerializer.Serialize(bsonWriter, keyParameters);

        return stream.ToArray();
    }

    public static RSA DeserializeAsymmetricKey(byte[] bytes)
    {
        using MemoryStream stream = new(bytes);
        using BsonReader bsonReader = new BsonBinaryReader(stream);

        RSAParameters keyParameters = BsonSerializer.Deserialize<RSAParameters>(bsonReader);
        return RSA.Create(keyParameters);
    }

    public static byte[] SerializeSymmetricKey(Aes key) => [.. key.Key, .. key.IV];

    public static Aes DeserializeSymmetricKey(byte[] aesKey, byte[] aesIv) =>
        DeserializeSymmetricKey([.. aesKey, .. aesIv]);

    public static Aes DeserializeSymmetricKey(byte[] bytes)
    {
        Aes aes = Aes.Create();

        aes.KeySize = 256;
        aes.Key = bytes[0..32];
        aes.IV = bytes[32..48];

        return aes;
    }

    public static byte[] Encrypt(RSA key, byte[] input) =>
        key.Encrypt(input, RSAEncryptionPadding.OaepSHA512);

    public static byte[] Decrypt(RSA key, byte[] input) =>
        key.Decrypt(input, RSAEncryptionPadding.OaepSHA512);

    public static byte[] Encrypt(Aes aes, byte[] input)
    {
        using ICryptoTransform encryptor = aes.CreateEncryptor();

        return encryptor.TransformFinalBlock(input, 0, input.Length);
    }

    public static byte[] Decrypt(Aes aes, byte[] input)
    {
        using ICryptoTransform decryptor = aes.CreateDecryptor();

        return decryptor.TransformFinalBlock(input, 0, input.Length);
    }
}
