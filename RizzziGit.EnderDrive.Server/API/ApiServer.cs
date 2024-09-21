using System;
using System.Net;
using System.Net.WebSockets;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Logging;

namespace RizzziGit.EnderDrive.Server.API;

using Commons.Net;
using Commons.Services;
using Core;
using Services;

public sealed partial class ApiServerParams
{
    public required WebApplication WebApplication;
}

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

        return new() { WebApplication = app, SessionManager = sessionManager };
    }

    protected override async Task OnRun(ApiServerParams data, CancellationToken cancellationToken)
    {
        Data.WebApplication.Use(
            (HttpContext context, Func<Task> next) => Handle(context, next, cancellationToken)
        );

        await Data.WebApplication.RunAsync();
    }

    protected override async Task OnStop(ApiServerParams data, Exception? exception)
    {
        await Data.WebApplication.StopAsync(CancellationToken.None);

        await StopServices(Data.SessionManager);
    }

    private async Task Handle(
        HttpContext context,
        Func<Task> next,
        CancellationToken cancellationToken
    )
    {
        if (context.WebSockets.IsWebSocketRequest)
        {
            using WebSocket socket = await context.WebSockets.AcceptWebSocketAsync();

            await Handle(socket, context.Request.Path, cancellationToken);
        }
    }
}
