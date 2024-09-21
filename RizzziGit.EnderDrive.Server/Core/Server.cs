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
}

public sealed class Server(string workingPath) : Service2<ServerData>("Server")
{
    private string ServerFolder => Path.Join(workingPath, ".EnderDrive");
    private string DatabaseFolder => Path.Join(ServerFolder, "Database");

    protected override async Task<ServerData> OnStart(CancellationToken cancellationToken)
    {
        ResourceManager resourceManager = new(this);
        KeyManager keyGenerator = new(this);

        await StartServices([resourceManager, keyGenerator], cancellationToken);

        return new() { ResourceManager = resourceManager, KeyGenerator = keyGenerator };
    }

    public ResourceManager ResourceManager => Data.ResourceManager;
    public KeyManager KeyManager => Data.KeyGenerator;

    public new Task Start(CancellationToken cancellationToken = default) =>
        base.Start(cancellationToken);

    protected override async Task OnRun(ServerData data, CancellationToken cancellationToken)
    {
        await await Task.WhenAny(
            data.ResourceManager.Join(cancellationToken),
            data.KeyGenerator.Join(cancellationToken)
        );
    }

    protected override async Task OnStop(ServerData data, Exception? exception)
    {
        await StopServices(data.KeyGenerator, data.ResourceManager);
    }
}
