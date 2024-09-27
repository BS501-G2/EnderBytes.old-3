using System;
using System.Collections.Generic;
using System.Net;
using System.Net.WebSockets;
using System.Text.RegularExpressions;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;

namespace RizzziGit.EnderDrive.Server.API;

using Commons.Services;
using Core;
using Services;

public sealed class ApiRequestHandler
{
    public required Regex Path;
    public required NonGenericApiRequestHandler Handler;
}

public sealed partial class ApiServerParams
{
    public required WebApplication WebApplication;
    public required SessionManager SessionManager;
    public required List<ApiRequestHandler> Handlers;
}

public delegate Task<BsonDocument> NonGenericApiRequestHandler(
    ApiRequestPathMatch pathMatch,
    HttpContext context,
    BsonDocument request
);

public delegate Task<Response> ApiRequestHandler<Request, Response>(
    ApiRequestPathMatch pathMatch,
    HttpContext context,
    Request request
);

public sealed class ApiRequestPathMatch
{
    public required Regex Pattern;
    public required string Path;
    public required Match Match;
}

public sealed class ApiBsonDocumentWrap<D>
{
    public required D Data;
}

public abstract class ApiResponseData<D>
{
    private ApiResponseData() { }

    public required ushort Status;

    public sealed class OK : ApiResponseData<D>
    {
        public required D Data;
    }

    public sealed class Error : ApiResponseData<D>
    {
        public required string Name;
        public required string Message;
    }
}

internal sealed class ApiRequestDeserializationError : Exception { }

internal sealed class ApiResponseSerializationError : Exception { }

public static class RequestHandlerList
{
    public static void AddRestHandler<Request, Response>(
        this List<ApiRequestHandler> list,
        Regex path,
        ApiRequestHandler<Request, Response> handler
    )
    {
        list.Add(
            new()
            {
                Path = path,
                Handler = async (pathMatch, context, bsonRequest) =>
                {
                    Request request;
                    try
                    {
                        request = BsonSerializer
                            .Deserialize<ApiBsonDocumentWrap<Request>>(bsonRequest)
                            .Data;
                    }
                    catch
                    {
                        throw new ApiRequestDeserializationError();
                    }

                    Response response = await handler(pathMatch, context, request);

                    try
                    {
                        return response.ToBsonDocument();
                    }
                    catch
                    {
                        throw new ApiResponseSerializationError();
                    }
                },
            }
        );
    }
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

        return new()
        {
            WebApplication = app,
            SessionManager = sessionManager,
            Handlers = [],
        };
    }

    protected override async Task OnRun(ApiServerParams data, CancellationToken cancellationToken)
    {
        Data.WebApplication.Use(
            (HttpContext context, Func<Task> next) => Handle(context, cancellationToken)
        );

        var handlers = data.Handlers;

        handlers.AddRestHandler<string, string>(
            new("ECHO", RegexOptions.IgnoreCase),
            async (match, context, request) =>
            {
                return request;
            }
        );

        await Data.WebApplication.RunAsync();
    }

    protected override async Task OnStop(ApiServerParams data, Exception? exception)
    {
        await Data.WebApplication.StopAsync(CancellationToken.None);

        await StopServices(Data.SessionManager);
    }

    private async Task Handle(HttpContext context, CancellationToken cancellationToken)
    {
        string path = context.Request.Path;
    }
}
