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
    public static Task Main(string[] args) =>
        Task.Run(async () =>
        {
            Server server = new(Environment.CurrentDirectory);

            ConsoleCancelEventHandler? handler = null;
            Console.CancelKeyPress += handler = (origin, args) =>
            {
                server.Stop().Wait();

                Console.CancelKeyPress -= handler;
            };

            server.Logged += (level, scope, message, time) =>
                Console.WriteLine($"[{time}] [{level}] [{scope}]: {message}");

            await server.Start();
            try
            {
                // await UserTest(server);
                await ScanVirus(server);
            }
            finally
            {
                await server.Stop();
            }
        });
}
