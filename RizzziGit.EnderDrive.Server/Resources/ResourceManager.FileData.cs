using System;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;

namespace RizzziGit.EnderDrive.Server.Resources;

using Commons.Memory;
using Services;

public class FileData : ResourceData
{
    public required ObjectId FileId;
    public required ObjectId FileContentId;
    public required ObjectId FileSnapshotId;
    public required ObjectId AuthorUserId;
    public required ObjectId BufferId;

    public required long Index;
}

public class FileBuffer : ResourceData
{
    public required ObjectId FileId;
    public required ObjectId FileContentId;

    public required byte[] EncryptedBuffer;
}

public sealed partial class ResourceManager
{
    public async Task<CompositeBuffer> ReadFileBlock(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileSnapshot fileSnapshot,
        long index
    )
    {
        FileData? data = await Query<FileData>(
                transaction,
                (query) =>
                    query.Where(
                        (item) =>
                            item.FileId == file.Id
                            && item.FileSnapshotId == fileSnapshot.Id
                            && item.Index == index
                    )
            )
            .FirstOrDefaultAsync(transaction.CancellationToken);

        FileBuffer? fileBuffer =
            data != null
                ? await Query<FileBuffer>(
                        transaction,
                        (query) => query.Where((item) => data.BufferId == item.Id)
                    )
                    .FirstAsync(transaction.CancellationToken)
                : null;

        CompositeBuffer buffer =
            fileBuffer != null
                ? KeyManager.Decrypt(file, fileBuffer.EncryptedBuffer)
                : CompositeBuffer.Allocate(FILE_BUFFER_SIZE);

        return buffer;
    }

    public async Task WriteFileBlock(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileContent fileContent,
        FileSnapshot fileSnapshot,
        long index,
        UnlockedUserAuthentication userAuthentication,
        CompositeBuffer bytes
    )
    {
        FileData? data = await Query<FileData>(
                transaction,
                (query) =>
                    query.Where(
                        (item) =>
                            item.FileId == file.Id
                            && item.FileSnapshotId == fileSnapshot.Id
                            && item.Index == index
                    )
            )
            .FirstOrDefaultAsync(transaction.CancellationToken);

        bytes =
            bytes.Length < FILE_BUFFER_SIZE
                ? bytes.PadEnd(FILE_BUFFER_SIZE)
                : bytes.Slice(0, FILE_BUFFER_SIZE);

        FileBuffer buffer =
            new()
            {
                Id = ObjectId.GenerateNewId(),
                FileId = file.Id,
                FileContentId = fileContent.Id,
                EncryptedBuffer = KeyManager.Encrypt(file, bytes.ToByteArray()),
            };

        await Insert(transaction, [buffer]);

        if (data == null)
        {
            data = new()
            {
                Id = ObjectId.GenerateNewId(),

                FileId = file.Id,
                FileContentId = fileContent.Id,
                FileSnapshotId = fileSnapshot.Id,
                AuthorUserId = userAuthentication.UserId,
                BufferId = buffer.Id,

                Index = index,
            };

            await Insert(transaction, [data]);
        }
    }

    public async Task<CompositeBuffer> ReadFile(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileSnapshot fileSnapshot,
        long position,
        long size
    )
    {
        long readStart = position;
        long readEnd = long.Min(readStart + size, fileSnapshot.Size);

        long bytesRead = 0;
        long indexStart = Math.DivRem(position, FILE_BUFFER_SIZE, out long indexStartOffset);
        CompositeBuffer bytes = [];

        for (long index = indexStart; bytesRead < (readEnd - readStart); index++)
        {
            long bufferStart = indexStart == index ? indexStartOffset : 0;
            long bufferEnd = long.Clamp(
                bufferStart + long.Min(size - bytesRead, FILE_BUFFER_SIZE),
                0,
                fileSnapshot.Size - readStart
            );

            if (bufferEnd - bufferStart > 0)
            {
                CompositeBuffer buffer = await ReadFileBlock(
                    transaction,
                    file,
                    fileSnapshot,
                    index
                );

                CompositeBuffer toRead = buffer.Slice(bufferStart, bufferEnd);

                bytes.Append(toRead);
                bytesRead += toRead.Length;
            }
        }

        return bytes;
    }

    public async Task WriteFile(
        ResourceTransaction transaction,
        UnlockedFile file,
        FileContent fileContent,
        FileSnapshot fileSnapshot,
        UnlockedUserAuthentication userAuthentication,
        long position,
        CompositeBuffer bytes
    )
    {
        long writeStart = position;
        long writeEnd = position + bytes.Length;

        long bytesWritten = 0;
        long indexStart = Math.DivRem(position, FILE_BUFFER_SIZE, out long indexStartOffset);

        for (long index = indexStart; bytes.Length > bytesWritten; )
        {
            long currentStart = indexStart == index ? indexStartOffset : 0;
            long currentEnd =
                currentStart + long.Min(bytes.Length - bytesWritten, FILE_BUFFER_SIZE);

            if (currentEnd - currentStart > 0)
            {
                CompositeBuffer current = await ReadFileBlock(
                    transaction,
                    file,
                    fileSnapshot,
                    indexStart
                );

                CompositeBuffer toWrite = bytes.Slice(currentStart, currentEnd);

                current.Write(currentStart, toWrite);

                await WriteFileBlock(
                    transaction,
                    file,
                    fileContent,
                    fileSnapshot,
                    index,
                    userAuthentication,
                    current
                );

                bytesWritten += toWrite.Length;
            }
        }

        long newSize = long.Max(position + bytes.Length, fileSnapshot.Size);
        await Update(
            transaction,
            fileSnapshot,
            Builders<FileSnapshot>.Update.Set((item) => item.Size, newSize)
        );

        fileSnapshot.Size = newSize;
    }
}
