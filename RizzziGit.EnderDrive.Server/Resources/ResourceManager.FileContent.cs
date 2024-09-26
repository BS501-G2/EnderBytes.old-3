using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace RizzziGit.EnderDrive.Server.Resources;

using MongoDB.Driver;

public class FileContent : ResourceData
{
    public required ObjectId FileId;
    public required bool Main;
    public required string Name;
}

public sealed partial class ResourceManager
{
    public async Task<FileContent> GetMainFileContent(ResourceTransaction transaction, File file)
    {
        FileContent? content = await Query<FileContent>(
                transaction,
                (query) => query.Where((item) => item.FileId == file.Id && item.Main)
            )
            .FirstOrDefaultAsync(transaction.CancellationToken);

        if (content != null)
        {
            return content;
        }

        await Insert(
            transaction,
            content = new()
            {
                Id = ObjectId.GenerateNewId(),

                FileId = file.Id,
                Main = true,
                Name = "Main Content",
            }
        );

        return content;
    }

    public async Task<FileContent> CreateFileContent(
        ResourceTransaction transaction,
        UnlockedFile file,
        string name
    )
    {
        FileContent content =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                FileId = file.Id,
                Main = false,
                Name = name,
            };

        await Insert(transaction, content);

        return content;
    }

    public IAsyncEnumerable<FileContent> GetFileContents(
        ResourceTransaction transaction,
        File file,
        string? name = null
    ) =>
        Query<FileContent>(
            transaction,
            (query) =>
                query.Where(
                    (item) =>
                        item.FileId == file.Id
                        && (
                            name == null
                            || file.Name.Contains(
                                name,
                                System.StringComparison.CurrentCultureIgnoreCase
                            )
                        )
                )
        );
}
