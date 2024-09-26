using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using MongoDB.Bson;
using Services;

[Flags]
public enum UserRole
{
    None = 0,
    Admin = 1 << 0,
    NewsEditor = 1 << 1,
}

public class User : ResourceData
{
    public static implicit operator RSA(User user) =>
        KeyManager.DeserializeAsymmetricKey(user.RsaPublicKey);

    public required string Username;
    public required string FirstName;
    public required string? MiddleName;
    public required string LastName;
    public required string? DisplayName;

    public required UserRole Role;
    public required byte[] RsaPublicKey;
}

[Flags]
public enum UsernameValidation
{
    OK = 0,
    TooShort = 1 << 0,
    TooLong = 1 << 1,
    InvalidChars = 1 << 2,
}

public sealed partial class ResourceManager
{
    [GeneratedRegex("^\\w$")]
    private static partial Regex GetUsernameValidator();

    public const int USERNAME_MIN_LENGTH = 6;
    public const int USERNAME_MAX_LENGTH = 12;
    public readonly Regex USERNAME_CHAR_DICTIONARY = GetUsernameValidator();

    public UsernameValidation Validate(string username)
    {
        UsernameValidation validation = default;

        if (username.Length < USERNAME_MIN_LENGTH)
        {
            validation |= UsernameValidation.TooShort;
        }

        if (username.Length > USERNAME_MAX_LENGTH)
        {
            validation |= UsernameValidation.TooLong;
        }

        if (!USERNAME_CHAR_DICTIONARY.IsMatch(username))
        {
            validation |= UsernameValidation.InvalidChars;
        }

        return validation;
    }

    public async Task<(
        User User,
        UnlockedUserAuthentication UnlockedUserAuthentication
    )> CreateUser(
        ResourceTransaction transaction,
        string username,
        string firstName,
        string? middleName,
        string lastName,
        string? displayName,
        string password
    )
    {
        transaction.CancellationToken.ThrowIfCancellationRequested();

        RSA rsaKey = await KeyManager.GenerateAsymmetricKey(transaction.CancellationToken);
        byte[] rsaPublicKey = KeyManager.SerializeAsymmetricKey(rsaKey, false);
        byte[] rsaPrivateKey = KeyManager.SerializeAsymmetricKey(rsaKey, true);

        UserRole role = await Query<User>(
                transaction,
                (query) => query.Where((user) => user.Role >= UserRole.Admin)
            )
            .AnyAsync(transaction.CancellationToken)
            ? UserRole.None
            : UserRole.Admin;

        User user =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                Username = username,
                FirstName = firstName,
                MiddleName = middleName,
                LastName = lastName,
                DisplayName = displayName,

                Role = role,

                RsaPublicKey = rsaPublicKey,
            };

        await Insert(transaction, [user]);

        return (
            user,
            await AddInitialUserAuthentication(
                transaction,
                user,
                UserAuthenticationType.Password,
                Encoding.UTF8.GetBytes(password),
                rsaPublicKey,
                rsaPrivateKey
            )
        );
    }

    public async Task DeleteUser(
        ResourceTransaction transaction,
        User user,
        UnlockedUserAuthentication userAuthentication
    )
    {
        await foreach (
            UserAuthentication toDelete in Query<UserAuthentication>(
                transaction,
                (query) => query.Where((userAuthentication) => userAuthentication.UserId == user.Id)
            )
        )
        {
            await RemoveUserAuthentication(
                transaction,
                userAuthentication.Id != toDelete.Id
                    ? toDelete.Unlock(userAuthentication)
                    : userAuthentication,
                true
            );
        }

        await foreach (
            File file in Query<File>(
                transaction,
                (query) => query.Where((file) => file.UserId == user.Id)
            )
        )
        {
            await DeleteFile(transaction, file.Unlock(userAuthentication));
        }

        await Delete(transaction, user);
    }

    public ValueTask SetUserRole(ResourceTransaction transaction, User user, UserRole role) =>
        Update(transaction, user, Builders<User>.Update.Set((item) => item.Role, role));

    public async IAsyncEnumerable<User> GetUsers(
        ResourceTransaction transaction,
        string? searchString = null,
        UserRole? minRole = null,
        UserRole? maxRole = null
    )
    {
        await foreach (
            User user in Query<User>(
                transaction,
                (query) =>
                    query.Where(
                        (user) =>
                            (
                                searchString == null
                                || (
                                    user.FirstName.Contains(
                                        searchString,
                                        StringComparison.CurrentCultureIgnoreCase
                                    )
                                    || (
                                        user.MiddleName != null
                                        && user.MiddleName.Contains(
                                            searchString,
                                            StringComparison.CurrentCultureIgnoreCase
                                        )
                                    )
                                    || user.LastName.Contains(
                                        searchString,
                                        StringComparison.CurrentCultureIgnoreCase
                                    )
                                )
                            )
                            && (minRole == null || user.Role >= minRole)
                            && (maxRole == null || user.Role <= maxRole)
                    )
            )
        )
        {
            yield return user;
        }
    }
}
