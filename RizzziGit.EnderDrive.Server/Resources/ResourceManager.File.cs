using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using MongoDB.Bson;
using Newtonsoft.Json;

namespace RizzziGit.EnderDrive.Server.Resources;

using Services;

public enum FileType
{
    File,
    Folder,
}

public class File : ResourceData
{
    public required ObjectId? ParentId;
    public required ObjectId UserId;

    public required string Name;
    public required FileType Type;

    [JsonIgnore]
    public required byte[] EncryptedAesKey;

    [JsonIgnore]
    public required byte[] AesIv;

    public UnlockedFile Unlock(UnlockedUserAuthentication userAuthentication)
    {
        byte[] aesKey = KeyManager.Decrypt(userAuthentication, EncryptedAesKey);

        return new()
        {
            Original = this,

            Id = Id,
            ParentId = ParentId,
            UserId = userAuthentication.UserId,

            Name = Name,
            Type = Type,

            EncryptedAesKey = EncryptedAesKey,
            AesIv = AesIv,

            AesKey = aesKey,
        };
    }
}

public class UnlockedFile : File
{
    public static implicit operator Aes(UnlockedFile file) =>
        KeyManager.DeserializeSymmetricKey([.. file.AesKey, .. file.AesIv]);

    public required File Original;

    public required byte[] AesKey;
}

public sealed partial class ResourceManager
{
    public const int FILE_BUFFER_SIZE = 1024 * 256;

    public async Task<UnlockedFile> CreateFile(
        ResourceTransaction transaction,
        UserAuthentication userAuthentication,
        File? parent,
        string name
    )
    {
        using Aes aes = await KeyManager.GenerateSymmetricKey(transaction.CancellationToken);

        byte[] aesIv = aes.IV;
        byte[] aesKey = aes.Key;
        byte[] encryptedAesKey = KeyManager.Encrypt(userAuthentication, aesKey);

        File file =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                ParentId = parent?.Id,
                UserId = userAuthentication.UserId,

                Name = name,
                Type = FileType.File,

                EncryptedAesKey = encryptedAesKey,
                AesIv = aesIv,
            };

        await Insert(transaction, [file]);

        UnlockedFile unlockedFile =
            new()
            {
                Original = file,

                Id = file.Id,
                ParentId = file.ParentId,
                UserId = userAuthentication.UserId,

                Name = file.Name,
                Type = file.Type,

                EncryptedAesKey = encryptedAesKey,
                AesIv = aesIv,

                AesKey = aesKey,
            };

        return unlockedFile;
    }

    public async Task DeleteFile(ResourceTransaction transaction, UnlockedFile file)
    {
        await foreach (
            FileContent content in Query<FileContent>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id)
            )
        )
        {
            await Delete(transaction, content);
        }

        await foreach (
            FileSnapshot snapshot in Query<FileSnapshot>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id)
            )
        )
        {
            await Delete(transaction, snapshot);
        }

        await foreach (
            FileData fileData in Query<FileData>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id)
            )
        )
        {
            await Delete(transaction, fileData);
        }

        await foreach (
            FileBuffer fileData in Query<FileBuffer>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id)
            )
        )
        {
            await Delete(transaction, fileData);
        }

        await foreach (
            FileAccess fileAccess in Query<FileAccess>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id)
            )
        )
        {
            await Delete(transaction, fileAccess);
        }

        await Delete(transaction, file.Original);
    }

    public IAsyncEnumerable<File> GetFiles(
        ResourceTransaction transaction,
        File? parentFolder = null,
        FileType? type = null,
        string? name = null,
        User? user = null
    ) =>
        Query<File>(
            transaction,
            (query) =>
                query.Where(
                    (item) =>
                        (parentFolder == null || parentFolder.Id == item.ParentId)
                        && (type == null || item.Type == type)
                        && (
                            name == null
                            || item.Name.Contains(
                                name,
                                System.StringComparison.CurrentCultureIgnoreCase
                            )
                        )
                        && (user == null || user.Id == item.UserId)
                )
        );
}
