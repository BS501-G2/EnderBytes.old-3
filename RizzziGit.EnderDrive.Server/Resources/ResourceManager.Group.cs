using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using Newtonsoft.Json;

namespace RizzziGit.EnderDrive.Server.Resources;

using Services;
public class Group : ResourceData
{
    public static implicit operator RSA(Group groupMembership) =>
        KeyManager.DeserializeAsymmetricKey(groupMembership.RsaPublicKey);

    public required string Name;
    public required string? Description;

    [JsonIgnore]
    public required byte[] RsaPublicKey;
}

public enum GroupMembershipRole
{
    Member,
    Admin,
    Owner,
}

public class GroupMembership : ResourceData
{
    public static implicit operator RSA(GroupMembership groupMembership) =>
        KeyManager.DeserializeAsymmetricKey(groupMembership.RsaPublicKey);

    public required ObjectId GroupId;
    public required ObjectId UserId;

    public required byte[] RsaPublicKey;
    public required byte[] EncryptedRsaPrivateKey;

    public required GroupMembershipRole Role;
    public required bool Accepted;

    public UnlockedGroupMembership Unlock(UnlockedUserAuthentication userAuthentication)
    {
        byte[] rsaPrivateKey = KeyManager.Decrypt(userAuthentication, EncryptedRsaPrivateKey);

        return new()
        {
            Id = Id,

            Original = this,

            GroupId = GroupId,
            UserId = UserId,

            RsaPublicKey = RsaPublicKey,
            EncryptedRsaPrivateKey = EncryptedRsaPrivateKey,

            Role = Role,
            Accepted = Accepted,

            RsaPrivateKey = rsaPrivateKey,
        };
    }
}

public class UnlockedGroupMembership : GroupMembership
{
    public UnlockedGroupMembership() { }

    public static implicit operator RSA(UnlockedGroupMembership groupMembership) =>
        KeyManager.DeserializeAsymmetricKey(groupMembership.RsaPrivateKey);

    public required GroupMembership Original;

    public required byte[] RsaPrivateKey;
}

public sealed partial class ResourceManager
{
    public async Task<(Group Group, GroupMembership GroupMembership)> CreateGroup(
        ResourceTransaction transaction,
        string name,
        string? description,
        UnlockedUserAuthentication unlockedUserAuthentication
    )
    {
        RSA rsa = await KeyManager.GenerateAsymmetricKey(transaction.CancellationToken);
        byte[] rsaPrivateKey = KeyManager.SerializeAsymmetricKey(rsa, true);
        byte[] rsaPublicKey = KeyManager.SerializeAsymmetricKey(rsa, false);

        Group group =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                Name = name,
                Description = description,
                RsaPublicKey = rsaPublicKey,
            };

        await Insert(transaction, [group]);

        return (
            group,
            await AddInitialGroupMember(
                transaction,
                group,
                unlockedUserAuthentication,
                rsaPrivateKey,
                rsaPublicKey
            )
        );
    }

    private async Task<UnlockedGroupMembership> AddInitialGroupMember(
        ResourceTransaction transaction,
        Group group,
        UnlockedUserAuthentication userAuthentication,
        byte[] rsaPrivateKey,
        byte[] rsaPublicKey
    )
    {
        byte[] encryptedRsaPrivateKey = KeyManager.Encrypt(userAuthentication, rsaPrivateKey);

        GroupMembership membership =
            new()
            {
                Id = ObjectId.GenerateNewId(),

                GroupId = group.Id,
                UserId = userAuthentication.UserId,

                RsaPublicKey = rsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPrivateKey,

                Role = GroupMembershipRole.Owner,
                Accepted = true,
            };

        await Insert(transaction, [membership]);

        return new()
        {
            Original = membership,

            Id = membership.Id,

            GroupId = group.Id,
            UserId = membership.Id,

            RsaPublicKey = membership.RsaPublicKey,
            EncryptedRsaPrivateKey = encryptedRsaPrivateKey,

            Role = membership.Role,
            Accepted = membership.Accepted,

            RsaPrivateKey = rsaPrivateKey,
        };
    }

    public async Task<UnlockedGroupMembership> AddGroupMember(
        ResourceTransaction transaction,
        UnlockedGroupMembership adder,
        User user
    )
    {
        byte[] encryptedRsaPublicKey = KeyManager.Encrypt(user, adder.RsaPrivateKey);

        GroupMembership membership =
            new()
            {
                Id = ObjectId.GenerateNewId(),

                GroupId = adder.GroupId,
                UserId = user.Id,

                RsaPublicKey = adder.RsaPublicKey,
                EncryptedRsaPrivateKey = encryptedRsaPublicKey,

                Role = GroupMembershipRole.Member,
                Accepted = false,
            };

        return new()
        {
            Original = membership,

            Id = membership.Id,

            GroupId = membership.GroupId,
            UserId = membership.UserId,

            RsaPublicKey = membership.RsaPublicKey,
            EncryptedRsaPrivateKey = membership.EncryptedRsaPrivateKey,

            Role = membership.Role,
            Accepted = membership.Accepted,

            RsaPrivateKey = adder.RsaPrivateKey,
        };
    }

    public async Task<GroupMembership> AcceptGroupInvite(
        ResourceTransaction transaction,
        UnlockedUserAuthentication userAuthentication,
        GroupMembership membership
    )
    {
        if (membership.Accepted)
        {
            return membership;
        }

        return await UpdateReturn(
            transaction,
            membership,
            Builders<GroupMembership>.Update.Set((e) => e.Accepted, true)
        );
    }

    public Task RemoveGroupMember(ResourceTransaction transaction, GroupMembership membership) =>
        Delete(transaction, membership);

    public IAsyncEnumerable<GroupMembership> GetGroupMemberships(
        ResourceTransaction transaction,
        User? user = null,
        Group? group = null,
        GroupMembershipRole? minRole = null,
        GroupMembershipRole? maxRole = null
    ) =>
        Query<GroupMembership>(
            transaction,
            (query) =>
                query.Where(
                    (item) =>
                        (user == null || item.UserId == user.Id)
                        && (group == null || item.GroupId == group.Id)
                        && (minRole == null || item.Role >= minRole)
                        && (maxRole == null || item.Role <= maxRole)
                )
        );
}
