using System.Collections.Generic;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Threading;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

public sealed partial class ResourceManager
{
    private delegate IQueryable<T> QueryBuilder<T>(IQueryable<T> query)
        where T : ResourceData;

    private async Task Insert<T>(ResourceTransaction transaction, params T[] items)
        where T : ResourceData
    {
        await foreach (T _ in InsertReturn(transaction, items))
        {
            continue;
        }
    }

    private async IAsyncEnumerable<T> InsertReturn<T>(
        ResourceTransaction transaction,
        params T[] items
    )
        where T : ResourceData
    {
        IMongoCollection<T> collection = GetCollection<T>();

        await collection.InsertManyAsync(items, null, transaction.CancellationToken);

        foreach (T item in items)
        {
            yield return item;
        }
    }

    private async ValueTask Update<T>(
        ResourceTransaction transaction,
        T item,
        UpdateDefinition<T> update
    )
        where T : ResourceData
    {
        _ = await UpdateReturn(transaction, item, update);
    }

    private ValueTask<T> UpdateReturn<T>(
        ResourceTransaction transaction,
        T item,
        UpdateDefinition<T> update
    )
        where T : ResourceData =>
        UpdateReturn(transaction, new T[] { item }.ToAsyncEnumerable(), update)
            .FirstAsync(transaction.CancellationToken);

    private async Task Update<T>(
        ResourceTransaction transaction,
        IAsyncEnumerable<T> enumerable,
        UpdateDefinition<T> update
    )
        where T : ResourceData
    {
        await foreach (T item in UpdateReturn<T>(transaction, enumerable, update))
        {
            continue;
        }
    }

    private async IAsyncEnumerable<T> UpdateReturn<T>(
        ResourceTransaction transaction,
        IAsyncEnumerable<T> enumerable,
        UpdateDefinition<T> update
    )
        where T : ResourceData
    {
        IMongoCollection<T> collection = GetCollection<T>();
        transaction.CancellationToken.ThrowIfCancellationRequested();

        await foreach (T updateItem in enumerable)
        {
            transaction.CancellationToken.ThrowIfCancellationRequested();

            UpdateResult a = await collection.UpdateOneAsync(
                Builders<T>.Filter.Where((e) => e.Id == updateItem.Id),
                update,
                null,
                transaction.CancellationToken
            );

            yield return await Query<T>(
                    transaction,
                    (query) => query.Where((item) => item.Id == updateItem.Id)
                )
                .FirstAsync(transaction.CancellationToken);
        }
    }

    private async Task Delete<T>(ResourceTransaction transaction, T item)
        where T : ResourceData
    {
        _ = await DeleteReturn(transaction, item);
    }

    private ValueTask<T> DeleteReturn<T>(ResourceTransaction transaction, T item)
        where T : ResourceData =>
        DeleteReturn(transaction, new T[] { item }.ToAsyncEnumerable())
            .FirstAsync(transaction.CancellationToken);

    private async Task Delete<T>(ResourceTransaction transaction, IAsyncEnumerable<T> enumerable)
        where T : ResourceData
    {
        await foreach (T _ in DeleteReturn(transaction, enumerable))
        {
            continue;
        }
    }

    private async IAsyncEnumerable<T> DeleteReturn<T>(
        ResourceTransaction transaction,
        IAsyncEnumerable<T> enumerable
    )
        where T : ResourceData
    {
        IMongoCollection<T> collection = GetCollection<T>();
        transaction.CancellationToken.ThrowIfCancellationRequested();

        await foreach (T deleteItem in enumerable)
        {
            transaction.CancellationToken.ThrowIfCancellationRequested();

            await collection.DeleteOneAsync(
                (item) => deleteItem.Id == item.Id,
                null,
                transaction.CancellationToken
            );

            yield return deleteItem;
        }
    }

    private async IAsyncEnumerable<T> Query<T>(
        ResourceTransaction transaction,
        QueryBuilder<T> query
    )
        where T : ResourceData
    {
        IMongoCollection<T> collection = GetCollection<T>();
        transaction.CancellationToken.ThrowIfCancellationRequested();

        await foreach (T item in query(collection.AsQueryable()).ToAsyncEnumerable())
        {
            transaction.CancellationToken.ThrowIfCancellationRequested();

            yield return item;
        }
    }

    private async IAsyncEnumerable<T> Query<T>(
        ResourceTransaction transaction,
        FilterDefinition<T> filter
    )
        where T : ResourceData
    {
        IMongoCollection<T> collection = GetCollection<T>();
        transaction.CancellationToken.ThrowIfCancellationRequested();

        var cursor = await collection.FindAsync(filter, null, transaction.CancellationToken);
        while (await cursor.MoveNextAsync(transaction.CancellationToken))
        {
            transaction.CancellationToken.ThrowIfCancellationRequested();

            await foreach (T item in cursor.Current.ToAsyncEnumerable())
            {
                transaction.CancellationToken.ThrowIfCancellationRequested();

                yield return item;
            }
        }
    }

    public ValueTask<T?> QueryById<T>(ResourceTransaction transaction, ObjectId objectId)
        where T : ResourceData =>
        Query<T>(transaction, (query) => query.Where((item) => item.Id == objectId))
            .FirstOrDefaultAsync(transaction.CancellationToken);
}
