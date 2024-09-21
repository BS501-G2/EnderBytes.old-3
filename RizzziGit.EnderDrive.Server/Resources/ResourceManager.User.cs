using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using System;
using System.Linq;
using MongoDB.Bson;
using Services;

public enum UserRole
{
    Member,
    Admin,
}

public class User : ResourceData
{
    public static implicit operator RSA(User user) =>
        KeyManager.DeserializeAsymmetricKey(user.RsaPublicKey);

    public required string Username;
    public required string FirstName;
    public required string LastName;
    public required string? DisplayName;

    public required UserRole Role;
    public required byte[] RsaPublicKey;
}

public sealed partial class ResourceManager
{
    private IMongoCollection<User> Users => GetCollection<User>();

    public async Task<(
        User User,
        UnlockedUserAuthentication UnlockedUserAuthentication
    )> CreateUser(
        ResourceTransactionParams transactionParams,
        string username,
        string firstName,
        string lastName,
        string? displayName,
        string password
    )
    {
        transactionParams.CancellationToken.ThrowIfCancellationRequested();

        RSA rsaKey = await KeyManager.GenerateAsymmetricKey(transactionParams.CancellationToken);
        byte[] rsaPublicKey = KeyManager.SerializeAsymmetricKey(rsaKey, false);
        byte[] rsaPrivateKey = KeyManager.SerializeAsymmetricKey(rsaKey, true);

        User user =
            new()
            {
                Username = username,
                FirstName = firstName,
                LastName = lastName,
                DisplayName = displayName,

                Role = await Users
                    .AsQueryable()
                    .Where((user) => user.Role >= UserRole.Admin)
                    .ToAsyncEnumerable()
                    .AnyAsync(transactionParams.CancellationToken)
                    ? UserRole.Member
                    : UserRole.Admin,

                RsaPublicKey = rsaPublicKey,
            };

        await Users.InsertOneAsync(user, null, transactionParams.CancellationToken);

        return (
            user,
            await AddInitialUserAuthentication(
                transactionParams,
                user,
                rsaPublicKey,
                rsaPrivateKey,
                UserAuthenticationType.Password,
                Encoding.UTF8.GetBytes(password)
            )
        );
    }
}
