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

namespace RizzziGit.EnderDrive.Server.Services;

using System.Collections.Generic;
using Commons.Memory;
using Commons.Services;
using Core;
using API;

public sealed class SessionManagerParams
{
    public required List<Session> Sessions;
}

public sealed class Session
{
    public required ulong Id;
}

public sealed class SessionManager(Server server, ApiServer apiServer)
    : Service2<SessionManagerParams>("Sessions", server)
{
    protected override async Task<SessionManagerParams> OnStart(CancellationToken cancellationToken)
    {
        List<Session> sessions = [];

        return new() { Sessions = sessions };
    }

    protected override async Task OnStop(SessionManagerParams data, Exception? exception)
    {
    }
}
