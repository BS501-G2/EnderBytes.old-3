using System;
using System.IO;
using System.IO.Pipes;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Threading.Tasks;
using ClamAV.Net.Client;
using ClamAV.Net.Client.Results;

namespace RizzziGit.EnderDrive.Server.Services;

using System.Collections.Generic;
using Commons.Collections;
using Commons.Services;
using Core;
using Utilities;

public sealed class VirusScannerParams
{
    public required IClamAvClient Client;
    public required TcpListener InternalTcpListener;
    public required WaitQueue<(
        TaskCompletionSource<ScanResult> Source,
        Stream Stream,
        CancellationToken CancellationToken
    )> WaitQueue;
}

public sealed class VirusScanner(Server server, string unixSocketPath)
    : Service2<VirusScannerParams>("Virus Scanner", server)
{
    protected override async Task<VirusScannerParams> OnStart(CancellationToken cancellationToken)
    {
        IPEndPoint ipEndPoint = new(IPAddress.Loopback, 9000);
        IClamAvClient client = ClamAvClient.Create(new($"tcp://{ipEndPoint}"));

        await client.PingAsync(cancellationToken);

        VersionResult version = await client.GetVersionAsync(cancellationToken);

        Info("Version", version.ProgramVersion);
        Info("Version", $"Virus Database {version.VirusDbVersion}");

        TcpListener internalTcpListener = new(ipEndPoint);

        internalTcpListener.Start();

        return new()
        {
            Client = client,
            InternalTcpListener = internalTcpListener,
            WaitQueue = new(),
        };
    }

    private async Task HandleTcpClient(TcpClient client, CancellationToken cancellationToken)
    {
        using Socket socket = new(AddressFamily.Unix, SocketType.Stream, ProtocolType.IP);
        await socket.ConnectAsync(new UnixDomainSocketEndPoint(unixSocketPath));

        using NetworkStream clientStream = client.GetStream();
        using NetworkStream socketStream = new(socket, true);

        async Task pipe(NetworkStream from, NetworkStream to)
        {
            byte[] buffer = new byte[1024 * 256];
            while (true)
            {
                int bufferRead = await from.ReadAsync(buffer, cancellationToken);
                if (bufferRead == 0)
                {
                    break;
                }

                await to.WriteAsync(buffer.AsMemory(0, bufferRead), cancellationToken);
            }
        }

        await Task.WhenAny([pipe(socketStream, clientStream), pipe(clientStream, socketStream)]);
    }

    private async Task ListenTcp(TcpListener listener, CancellationToken cancellationToken)
    {
        List<Task> connections = [];

        try
        {
            while (true)
            {
                cancellationToken.ThrowIfCancellationRequested();

                TaskCompletionSource source = new();

                _ = Task.Run(
                    async () =>
                    {
                        TcpClient client;

                        try
                        {
                            client = await listener.AcceptTcpClientAsync(cancellationToken);

                            source.SetResult();
                        }
                        catch (Exception exception)
                        {
                            source.SetException(exception);
                            return;
                        }

                        async Task handle()
                        {
                            using (client)
                            {
                                await HandleTcpClient(client, cancellationToken);
                            }
                        }

                        Task task = handle();
                        try
                        {
                            lock (connections)
                            {
                                connections.Add(task);
                            }

                            await task;
                        }
                        catch (Exception exception)
                        {
                            lock (connections)
                            {
                                connections.Remove(task);
                            }

                            Error("TCP", $"Handler Exception: {exception.ToPrintable()}");
                        }
                    },
                    CancellationToken.None
                );

                await source.Task;
            }
        }
        catch
        {
            await Task.WhenAll(connections);

            throw;
        }
    }

    private async Task RunScanQueue(
        IClamAvClient client,
        CancellationToken serviceCancellationToken
    )
    {
        while (true)
        {
            serviceCancellationToken.ThrowIfCancellationRequested();

            await foreach (
                var (source, stream, cancellationToken) in Data.WaitQueue.WithCancellation(
                    serviceCancellationToken
                )
            )
            {
                using CancellationTokenSource linked =
                    CancellationTokenSource.CreateLinkedTokenSource(
                        serviceCancellationToken,
                        cancellationToken
                    );

                try
                {
                    ScanResult result = await Data.Client.ScanDataAsync(stream, linked.Token);

                    source.SetResult(result);
                }
                catch (Exception exception)
                {
                    source.SetException(exception);
                }
            }
        }
    }

    protected override Task OnRun(VirusScannerParams data, CancellationToken cancellationToken) =>
        Task.WhenAll(
            [
                ListenTcp(data.InternalTcpListener, cancellationToken),
                RunScanQueue(data.Client, cancellationToken),
            ]
        );

    protected override Task OnStop(VirusScannerParams data, Exception? exception)
    {
        data.Client.Dispose();

        return base.OnStop(data, exception);
    }

    public async Task<ScanResult> Scan(Stream stream, CancellationToken cancellationToken = default)
    {
        TaskCompletionSource<ScanResult> source = new();

        await Data.WaitQueue.Enqueue((source, stream, cancellationToken), cancellationToken);
        return await source.Task;
    }
}
