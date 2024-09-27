using System;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using RizzziGit.Commons.Services;

namespace RizzziGit.EnderDrive.Server.Core;

using Resources;
using RizzziGit.EnderDrive.Server.API;
using Services;

public sealed class ServerData
{
    public required ResourceManager ResourceManager;
    public required KeyManager KeyGenerator;
    public required VirusScanner VirusScanner;
    public required ApiServer ApiServer;
}

public sealed class Server(
    string workingPath,
    string clamAvSocketPath = "/run/clamav/clamd.ctl",
    int httpPort = 8082,
    int httpsPort = 8442
) : Service2<ServerData>("Server")
{
    private string ServerFolder => Path.Join(workingPath, ".EnderDrive");

    protected override async Task<ServerData> OnStart(CancellationToken cancellationToken)
    {
        ResourceManager resourceManager = new(this);
        KeyManager keyGenerator = new(this);
        VirusScanner virusScanner = new(this, clamAvSocketPath);
        ApiServer apiServer = new(this, httpPort, httpsPort);

        await StartServices(
            [keyGenerator, virusScanner, resourceManager, apiServer],
            cancellationToken
        );

        return new()
        {
            ResourceManager = resourceManager,
            KeyGenerator = keyGenerator,
            VirusScanner = virusScanner,
            ApiServer = apiServer,
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
            data.ApiServer.Join(cancellationToken)
        );
    }

    protected override async Task OnStop(ServerData data, Exception? exception)
    {
        await StopServices(
            data.ApiServer,
            data.ResourceManager,
            data.VirusScanner,
            data.KeyGenerator
        );
    }
}
