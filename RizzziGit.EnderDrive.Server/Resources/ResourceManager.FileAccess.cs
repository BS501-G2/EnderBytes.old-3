using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace RizzziGit.EnderDrive.Server.Resources;

using Services;

public enum FileAccessLevel
{
    Read,
    ReadWrite,
    Manage,
    Full,
}

public enum FileAccessTargetEntityType
{
    User,
    Group,
}

public class FileAccess : ResourceData
{
    public required ObjectId FileId;
    public required ObjectId FileContentId;
    public required FileAccessTargetEntityType TargetEntityType;
    public required ObjectId TargetEntityId;

    public required byte[] EncryptedAesKey;
    public required byte[] AesIv;

    public required FileAccessLevel Level;

    public UnlockedFileAccess Unlock(UnlockedUserAuthentication userAuthentication)
    {
        byte[] aesKey = KeyManager.Decrypt(userAuthentication, EncryptedAesKey);

        return new()
        {
            Original = this,

            Id = Id,

            FileId = FileId,
            FileContentId = FileContentId,
            TargetEntityType = TargetEntityType,
            TargetEntityId = TargetEntityId,

            EncryptedAesKey = EncryptedAesKey,
            AesIv = AesIv,

            AesKey = aesKey,

            Level = Level,
        };
    }
}

public class UnlockedFileAccess : FileAccess
{
    public static implicit operator Aes(UnlockedFileAccess file) =>
        KeyManager.DeserializeSymmetricKey([.. file.AesKey, .. file.AesIv]);

    public required FileAccess Original;

    public required byte[] AesKey;
}

public sealed partial class ResourceManager
{
    public async Task<UnlockedFileAccess> CreateFileAccess(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileContent fileContent,
        UserAuthentication userAuthentication,
        FileAccessLevel level
    )
    {
        byte[] encryptedAesKey = KeyManager.Encrypt(userAuthentication, file.AesKey);
        FileAccess access =
            new()
            {
                Id = ObjectId.GenerateNewId(),

                FileId = file.Id,
                FileContentId = fileContent.Id,
                TargetEntityType = FileAccessTargetEntityType.User,
                TargetEntityId = userAuthentication.UserId,

                EncryptedAesKey = encryptedAesKey,
                AesIv = file.AesIv,

                Level = level,
            };

        await Insert(transaction, [access]);

        return new()
        {
            Original = access,

            Id = access.Id,

            FileId = access.FileId,
            FileContentId = fileContent.Id,
            TargetEntityType = FileAccessTargetEntityType.User,
            TargetEntityId = userAuthentication.UserId,

            EncryptedAesKey = access.EncryptedAesKey,
            AesIv = access.AesIv,

            Level = access.Level,

            AesKey = file.AesKey,
        };
    }

    public async Task<UnlockedFileAccess> CreateFileAccess(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileContent fileContent,
        Group group,
        FileAccessLevel level
    )
    {
        byte[] encryptedAesKey = KeyManager.Encrypt(group, file.AesKey);
        FileAccess access =
            new()
            {
                Id = ObjectId.GenerateNewId(),

                FileId = file.Id,
                FileContentId = fileContent.Id,
                TargetEntityType = FileAccessTargetEntityType.Group,
                TargetEntityId = group.Id,

                EncryptedAesKey = encryptedAesKey,
                AesIv = file.AesIv,

                Level = level,
            };

        await Insert(transaction, [access]);

        return new()
        {
            Original = access,

            Id = access.Id,

            FileId = access.FileId,
            FileContentId = fileContent.Id,
            TargetEntityType = FileAccessTargetEntityType.Group,
            TargetEntityId = group.Id,

            EncryptedAesKey = access.EncryptedAesKey,
            AesIv = access.AesIv,

            Level = access.Level,

            AesKey = file.AesKey,
        };
    }

    public IAsyncEnumerable<FileAccess> GetFileAccesses(
        ResourceTransaction transaction,
        User? user = null,
        Group? group = null,
        File? file = null
    ) =>
        Query<FileAccess>(
            transaction,
            (query) =>
                query.Where(
                    (item) =>
                        (
                            user == null
                            || (
                                item.TargetEntityType == FileAccessTargetEntityType.User
                                && user.Id == item.TargetEntityId
                            )
                        )
                        && (
                            group == null
                            || (
                                item.TargetEntityType == FileAccessTargetEntityType.Group
                                && group.Id == item.TargetEntityId
                            )
                        )
                        && (file == null || file.Id == item.FileId)
                )
        );
}
