using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;

namespace RizzziGit.EnderDrive.Server.Resources;

using MongoDB.Driver;

public sealed partial class ResourceManager
{
    public class FileSnapshot : ResourceData
    {
        public required ObjectId FileId;
        public required ObjectId FileContentId;
        public required ObjectId AuthorUserId;
        public required ObjectId? BaseFileSnapshotId;

        public required long Size;
    }

    public async Task<FileSnapshot> CreateFileSnapshot(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileContent fileContent,
        UnlockedUserAuthentication userAuthentication,
        FileSnapshot? baseFileSnapshot
    )
    {
        FileSnapshot fileSnapshot =
            new()
            {
                Id = ObjectId.GenerateNewId(),

                FileId = file.Id,
                FileContentId = fileContent.Id,
                AuthorUserId = userAuthentication.UserId,
                BaseFileSnapshotId = baseFileSnapshot?.Id,

                Size = 0,
            };

        await Insert(transaction, [fileSnapshot]);

        return fileSnapshot;
    }

    public ValueTask<FileSnapshot?> GetLatestFileSnapshot(
        ResourceTransaction transaction,
        File file,
        FileContent fileContent
    ) =>
        Query<FileSnapshot>(
                transaction,
                (query) =>
                    query
                        .Where(
                            (item) => item.FileId == file.Id && item.FileContentId == fileContent.Id
                        )
                        .OrderByDescending((item) => item.Id)
            )
            .FirstOrDefaultAsync(transaction.CancellationToken);
}
