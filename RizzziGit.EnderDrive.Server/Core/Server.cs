using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using RizzziGit.Commons.Services;

namespace RizzziGit.EnderDrive.Server.Core;

using Resources;
using Services;

public sealed class ServerData
{
    public required ResourceManager ResourceManager;
    public required KeyManager KeyGenerator;
    public required VirusScanner VirusScanner;
    public required ConnectionManager ConnectionManager;
}

public sealed class Server(string workingPath, string clamAvSocketPath = "/run/clamav/clamd.ctl")
    : Service2<ServerData>("Server")
{
    private string ServerFolder => Path.Join(workingPath, ".EnderDrive");
    private string DatabaseFolder => Path.Join(ServerFolder, "Database");

    protected override async Task<ServerData> OnStart(CancellationToken cancellationToken)
    {
        ResourceManager resourceManager = new(this);
        KeyManager keyGenerator = new(this);
        VirusScanner virusScanner = new(this, clamAvSocketPath);
        ConnectionManager connectionManager = new(this);

        await StartServices(
            [keyGenerator, virusScanner, resourceManager, connectionManager],
            cancellationToken
        );

        return new()
        {
            ResourceManager = resourceManager,
            KeyGenerator = keyGenerator,
            VirusScanner = virusScanner,
            ConnectionManager = connectionManager,
        };
    }

    public ResourceManager ResourceManager => Data.ResourceManager;
    public KeyManager KeyManager => Data.KeyGenerator;
    public VirusScanner Scanner => Data.VirusScanner;

    public new Task Start(CancellationToken cancellationToken = default) =>
        base.Start(cancellationToken);

    protected override async Task OnRun(ServerData data, CancellationToken cancellationToken)
    {
        await await Task.WhenAny(
            data.KeyGenerator.Join(cancellationToken),
            data.VirusScanner.Join(cancellationToken),
            data.ResourceManager.Join(cancellationToken),
            data.ConnectionManager.Join(cancellationToken)
        );
    }

    protected override async Task OnStop(ServerData data, Exception? exception)
    {
        await StopServices(
            data.ConnectionManager,
            data.ResourceManager,
            data.VirusScanner,
            data.KeyGenerator
        );
    }
}
