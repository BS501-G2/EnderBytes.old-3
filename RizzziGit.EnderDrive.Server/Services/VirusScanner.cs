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
    public required VirusScanner.TcpForwarder TcpForwarder;
    public required IClamAvClient Client;
    public required WaitQueue<(
        TaskCompletionSource<ScanResult> Source,
        Stream Stream,
        CancellationToken CancellationToken
    )> WaitQueue;
}

public sealed partial class VirusScanner(Server server, string unixSocketPath)
    : Service2<VirusScannerParams>("Virus Scanner", server)
{
    protected override async Task<VirusScannerParams> OnStart(CancellationToken cancellationToken)
    {
        IPEndPoint ipEndPoint = new(IPAddress.Loopback, 9000);
        TcpForwarder tcpForwarder = new(this, ipEndPoint, unixSocketPath);

        await StartServices([tcpForwarder], cancellationToken);

        IClamAvClient client = ClamAvClient.Create(new($"tcp://{ipEndPoint}"));

        await client.PingAsync(cancellationToken);

        VersionResult version = await client.GetVersionAsync(cancellationToken);

        Info("Version", version.ProgramVersion);
        Info("Version", $"Virus Database {version.VirusDbVersion}");

        return new()
        {
            Client = client,
            TcpForwarder = tcpForwarder,
            WaitQueue = new(),
        };
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

    protected override async Task OnRun(
        VirusScannerParams data,
        CancellationToken cancellationToken
    )
    {
        await Task.WhenAll(
            [
                RunScanQueue(data.Client, cancellationToken),
                data.TcpForwarder.Join(cancellationToken),
            ]
        );
    }

    protected override async Task OnStop(VirusScannerParams data, Exception? exception)
    {
        data.Client.Dispose();

        await StopServices(data.TcpForwarder);
    }

    public async Task<ScanResult> Scan(Stream stream, CancellationToken cancellationToken = default)
    {
        TaskCompletionSource<ScanResult> source = new();

        await Data.WaitQueue.Enqueue((source, stream, cancellationToken), cancellationToken);
        return await source.Task;
    }
}
