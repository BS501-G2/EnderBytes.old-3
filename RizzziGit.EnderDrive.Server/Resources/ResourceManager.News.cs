using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace RizzziGit.EnderDrive.Server.Resources;

public class News : ResourceData
{
    public required string Title;
    public required ObjectId[] ImageFiles;
    public required ObjectId AuthorUserId;
}

public sealed partial class ResourceManager
{
    public async Task<News> CreateNews(
        ResourceTransaction transaction,
        string title,
        File[] images,
        User newsAuthor
    )
    {
        News news =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                Title = title,
                ImageFiles = images.Select((item) => item.Id).ToArray(),
                AuthorUserId = newsAuthor.Id,
            };

        await Insert(transaction, news);
        return news;
    }

    public async Task DeleteNews(ResourceTransaction transaction, News news)
    {
        await Delete(transaction, news);
    }

    public IAsyncEnumerable<News> GetNews(ResourceTransaction transaction) =>
        Query<News>(transaction, (query) => query.OrderByDescending((item) => item.Id));
}
