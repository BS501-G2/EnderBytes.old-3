using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Net.WebSockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Bson.Serialization;
using Newtonsoft.Json.Linq;

namespace RizzziGit.EnderDrive.Server.API;

using Commons.Memory;
using Commons.Services;
using Core;
using Services;

public sealed partial class ApiServerParams
{
    public required WebApplication WebApplication;
    public required SessionManager SessionManager;
}

public sealed partial class ApiRequestHook
{
    public required string Name;
    public required ApiRequestHandler Handler;
}

public delegate Task<Out> GenericApiRequestHandler<In, Out>(
    WebSocket webSocket,
    In parameters,
    CancellationToken cancellationToken
);

public delegate Task<JObject> ApiRequestHandler(
    WebSocket webSocket,
    JObject parameters,
    CancellationToken cancellationToken
);

public sealed partial class ApiServer(Server server, int httpPort, int httpsPort)
    : Service2<ApiServerParams>("API", server)
{
    protected override async Task<ApiServerParams> OnStart(CancellationToken cancellationToken)
    {
        SessionManager sessionManager = new(server, this);

        WebApplicationBuilder builder = WebApplication.CreateBuilder();

        builder.Logging.ClearProviders();
        builder.WebHost.ConfigureKestrel(
            (context, options) =>
            {
                options.Listen(
                    IPAddress.Any,
                    httpPort,
                    (options) =>
                    {
                        options.Protocols = HttpProtocols.Http1AndHttp2;
                    }
                );

                options.Listen(
                    IPAddress.Any,
                    httpsPort,
                    (options) =>
                    {
                        options.Protocols = HttpProtocols.Http1AndHttp2AndHttp3;
                        options.UseHttps();
                    }
                );
            }
        );

        WebApplication app = builder.Build();

        app.UseWebSockets(new() { KeepAliveInterval = TimeSpan.FromMinutes(2) });

        await StartServices([sessionManager], cancellationToken);

        Data.WebApplication.Use(
            (HttpContext context, Func<Task> next) => Handle(context, cancellationToken)
        );

        await app.StartAsync(cancellationToken);

        return new()
        {
            WebApplication = app,
            SessionManager = sessionManager,
        };
    }

    protected override async Task OnRun(ApiServerParams data, CancellationToken cancellationToken)
    {
        await base.OnRun(data, cancellationToken);
    }

    protected override async Task OnStop(ApiServerParams data, Exception? exception)
    {
        await Data.WebApplication.StopAsync(CancellationToken.None);

        await StopServices(Data.SessionManager);
    }

    private async Task Handle(HttpContext context, CancellationToken cancellationToken)
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            if (context.Request.Path == "/ws")
            {
                await Handle(await context.WebSockets.AcceptWebSocketAsync(), cancellationToken);
            }
        }
    }

    private async Task Handle(WebSocket webSocket, CancellationToken cancellationToken)
    {
        CompositeBuffer message = [];

        
    }
}
