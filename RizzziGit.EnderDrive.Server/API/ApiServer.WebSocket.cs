using System;
using System.Linq;
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

using System.Collections.Generic;
using Commons.Memory;
using Commons.Net;
using Commons.Services;
using Core;
using Services;

public sealed partial class ApiServerParams
{
    public required SessionManager SessionManager;
}

public sealed partial class ApiServer
{
    public const int MESSAGE_SIZE = 1024 * 256;

    private async Task Handle(WebSocket context, string path, CancellationToken cancellationToken)
    {
        HybridWebSocket hybridWebSocket =
            new(new() { MaxWebSocketPerMessageSize = MESSAGE_SIZE }, context);
    }
}
