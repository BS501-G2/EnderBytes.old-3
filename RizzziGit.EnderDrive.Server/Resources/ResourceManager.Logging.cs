using System;
using Microsoft.Extensions.Logging;
using MLogLevel = Microsoft.Extensions.Logging.LogLevel;

namespace RizzziGit.EnderDrive.Server.Resources;

using System.Text.Json;
using Commons.Logging;

public sealed partial class ResourceManager
{
    private delegate ILogger CreateLogger(string categoryName);

    private sealed class LoggerProvider(CreateLogger createLogger) : ILoggerProvider
    {
        public ILogger CreateLogger(string categoryName) => createLogger(categoryName);

        public void Dispose() { }
    }

    private sealed class Disposable : IDisposable
    {
        public void Dispose() { }
    }

    private sealed class LoggerInstance(ResourceManager manager) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => new Disposable();

        public bool IsEnabled(MLogLevel logLevel) => true;

        public void Log<TState>(
            MLogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter
        )
        {
            manager.Log(
                logLevel switch
                {
                    MLogLevel.Error => LogLevel.Error,
                    MLogLevel.Trace => LogLevel.Debug,
                    MLogLevel.Information => LogLevel.Info,
                    MLogLevel.Warning => LogLevel.Warn,
                    MLogLevel.Critical => LogLevel.Fatal,
                    MLogLevel.None => LogLevel.Info,

                    _ => throw new NotImplementedException(),
                },
                "Database Log",
                $"{formatter(state, exception)}"
            );
        }
    }
}
