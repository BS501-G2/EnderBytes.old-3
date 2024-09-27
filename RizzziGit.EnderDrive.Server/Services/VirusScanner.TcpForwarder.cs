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

public sealed partial class VirusScanner
{
    public sealed class TcpForwarderParams
    {
        public required TcpListener InternalTcpListener;
    }

    public sealed class TcpForwarder(
        VirusScanner scanner,
        IPEndPoint ipEndPoint,
        string unixSocketPath
    ) : Service2<TcpForwarderParams>("Tcp Forwarder", scanner)
    {
        protected override Task<TcpForwarderParams> OnStart(CancellationToken cancellationToken)
        {
            TcpListener internalTcpListener = new(ipEndPoint);

            internalTcpListener.Start();

            return Task.FromResult<TcpForwarderParams>(
                new() { InternalTcpListener = internalTcpListener }
            );
        }

        private async Task HandleTcpClient(TcpClient client, CancellationToken cancellationToken)
        {
            using Socket socket = new(AddressFamily.Unix, SocketType.Stream, ProtocolType.IP);
            await socket.ConnectAsync(new UnixDomainSocketEndPoint(unixSocketPath));

            using NetworkStream clientStream = client.GetStream();
            using NetworkStream socketStream = new(socket, true);

            async Task pipe(NetworkStream from, NetworkStream to)
            {
                byte[] buffer = new byte[1024 * 256];
                while (true)
                {
                    int bufferRead = await from.ReadAsync(buffer, cancellationToken);
                    if (bufferRead == 0)
                    {
                        break;
                    }

                    await to.WriteAsync(buffer.AsMemory(0, bufferRead), cancellationToken);
                }
            }

            await Task.WhenAny(
                [pipe(socketStream, clientStream), pipe(clientStream, socketStream)]
            );
        }

        private async Task ListenTcp(TcpListener listener, CancellationToken cancellationToken)
        {
            List<Task> connections = [];

            try
            {
                while (true)
                {
                    cancellationToken.ThrowIfCancellationRequested();

                    TaskCompletionSource source = new();

                    _ = Task.Run(
                        async () =>
                        {
                            TcpClient client;

                            try
                            {
                                client = await listener.AcceptTcpClientAsync(cancellationToken);

                                source.SetResult();
                            }
                            catch (Exception exception)
                            {
                                source.SetException(exception);
                                return;
                            }

                            async Task handle()
                            {
                                using (client)
                                {
                                    await HandleTcpClient(client, cancellationToken);
                                }
                            }

                            Task task = handle();
                            try
                            {
                                lock (connections)
                                {
                                    connections.Add(task);
                                }

                                await task;
                            }
                            catch (Exception exception)
                            {
                                lock (connections)
                                {
                                    connections.Remove(task);
                                }

                                Error("TCP", $"Handler Exception: {exception.ToPrintable()}");
                            }
                        },
                        CancellationToken.None
                    );

                    await source.Task;
                }
            }
            catch
            {
                await Task.WhenAll(connections);

                throw;
            }
        }

        protected override async Task OnRun(
            TcpForwarderParams data,
            CancellationToken cancellationToken
        )
        {
            await ListenTcp(data.InternalTcpListener, cancellationToken);
        }

        protected override Task OnStop(TcpForwarderParams data, Exception? exception)
        {
            data.InternalTcpListener.Stop();
            return Task.CompletedTask;
        }
    }
}
