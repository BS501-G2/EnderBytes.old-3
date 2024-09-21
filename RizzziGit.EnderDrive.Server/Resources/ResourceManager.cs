using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using Commons.Services;
using Core;
using Microsoft.Extensions.Logging;
using Services;

public sealed class MainResourceManagerData
{
    public required ILoggerFactory LoggerFactory;
    public required IMongoClient Client;
    public required RandomNumberGenerator RandomNumberGenerator;
}

public abstract class ResourceData
{
    public ObjectId Id = ObjectId.GenerateNewId();
}

public sealed partial class ResourceManager(Server server)
    : Service2<MainResourceManagerData>("Resource Manager", server)
{
    private IMongoClient Client => Data.Client;
    private IMongoDatabase Database => Client.GetDatabase("EnderDrive");

    private IMongoCollection<D> GetCollection<D>()
        where D : ResourceData => Database.GetCollection<D>(typeof(D).Name);

    private KeyManager KeyManager => server.KeyManager;

    protected override async Task<MainResourceManagerData> OnStart(
        CancellationToken cancellationToken
    )
    {
        ILoggerFactory loggerFactory = LoggerFactory.Create(
            (options) =>
                options.AddProvider(new LoggerProvider((category) => new LoggerInstance(this)))
        );

        MongoClient client =
            new(
                new MongoClientSettings()
                {
                    Server = new MongoServerAddress("127.0.0.1"),
                    LoggingSettings = new(loggerFactory),
                }
            );

        RandomNumberGenerator randomNumberGenerator = RandomNumberGenerator.Create();

        await client.DropDatabaseAsync("EnderDrive", cancellationToken);

        return new()
        {
            LoggerFactory = loggerFactory,
            Client = client,
            RandomNumberGenerator = randomNumberGenerator,
        };
    }
}
