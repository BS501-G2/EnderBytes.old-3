using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using RizzziGit.Commons.Memory;
using RizzziGit.EnderDrive.Server.Resources;

namespace RizzziGit.EnderDrive.Server;

using Core;

public static class Program
{
    private static async Task Server(Server server)
    {
        List<Task> tasks = [];
        for (int i = 0; i < 10000; i++)
        {
            Task run() =>
                server.ResourceManager.Transact(
                    async (parameters) =>
                    {
                        (User user, UnlockedUserAuthentication userAuthentication) =
                            await server.ResourceManager.CreateUser(
                                parameters,
                                "test",
                                "string",
                                "asd",
                                null,
                                "asds"
                            );

                        using MemoryStream stream = new();
                        using BsonWriter bsonWriter = new BsonBinaryWriter(stream);
                        BsonSerializer.Serialize(bsonWriter, user);
                        parameters.Logger.Info(
                            new string(
                                CompositeBuffer
                                    .From(stream.ToArray())
                                    .ToString()
                                    .Select(c => !char.IsControl(c) ? c : '\uFFFD')
                                    .ToArray()
                            )
                        );
                    },
                    CancellationToken.None
                );

            tasks.Add(Task.Run(run));
        }

        await Task.WhenAll(tasks);
    }

    public static Task Main(string[] args) =>
        Task.Run(async () =>
        {
            Core.Server server = new(Environment.CurrentDirectory);

            ConsoleCancelEventHandler? handler = null;
            Console.CancelKeyPress += handler = (origin, args) =>
            {
                server.Stop().Wait();

                Console.CancelKeyPress -= handler;
            };

            server.Logged += (level, scope, message, time) =>
            {
                Console.WriteLine($"[{time}] [{level}] [{scope}]: {message}");
            };

            await server.Start();
            await Server(server);
            await server.Stop();
        });
}
