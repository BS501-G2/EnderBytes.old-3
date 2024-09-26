using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace RizzziGit.EnderDrive.Server;

using Commons.Memory;
using Core;
using Resources;

public static partial class Program
{
    private static async Task UserTest(Server server)
    {
        ResourceManager resources = server.ResourceManager;

        var (user, userAuthentication) = await resources.Transact(
            async (transaction) =>
            {
                (User user, UnlockedUserAuthentication userAuthentication) =
                    await resources.CreateUser(transaction, "as", "ti", null, "A", null, "test");

                UnlockedFile file = await resources.CreateFile(
                    transaction,
                    userAuthentication,
                    null,
                    ""
                );

                FileSnapshot fileSnapshot = await resources.CreateFileSnapshot(
                    transaction,
                    file,
                    userAuthentication,
                    null
                );

                await using FileStream input = System.IO.File.Open(
                    "/home/carl/input.mp4",
                    FileMode.Open,
                    System.IO.FileAccess.Read,
                    FileShare.None
                );

                while (input.Position < input.Length)
                {
                    byte[] buffer = new byte[ResourceManager.FILE_BUFFER_SIZE];
                    int bufferSize = await input.ReadAsync(buffer, CancellationToken.None);

                    await resources.WriteFile(
                        transaction,
                        file,
                        fileSnapshot,
                        userAuthentication,
                        input.Position - bufferSize,
                        buffer[..bufferSize]
                    );
                }

                await using FileStream output = System.IO.File.Open(
                    "/home/carl/output.mp4",
                    FileMode.OpenOrCreate,
                    System.IO.FileAccess.Write,
                    FileShare.None
                );

                output.SetLength(0);

                for (long position = 0; position < input.Length; )
                {
                    CompositeBuffer bytes = await resources.ReadFile(
                        transaction,
                        file,
                        fileSnapshot,
                        position,
                        ResourceManager.FILE_BUFFER_SIZE
                    );

                    await output.WriteAsync(bytes.ToArray(), CancellationToken.None);

                    position += bytes.Length;
                    Console.Write($"\r Write: {position} MaxSize: {input.Length}");
                }

                return (user, userAuthentication);
            },
            CancellationToken.None
        );

        await Task.Delay(10000);

        await resources.Transact(
            async (transaction) =>
            {
                await resources.DeleteUser(transaction, user, userAuthentication);
            }
        );
    }
}
