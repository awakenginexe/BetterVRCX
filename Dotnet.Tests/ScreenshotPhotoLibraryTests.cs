using System;
using System.Data.SQLite;
using System.IO;
using System.Linq;
using System.Security.Cryptography;
using System.Threading.Tasks;
using Newtonsoft.Json;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.PixelFormats;
using VRCX;
using Xunit;

public class ScreenshotPhotoLibraryTests
{
    [Fact]
    public async Task PagesAndFiltersUseSharedMetadataWithoutChangingOriginals()
    {
        using var fixture = new PhotoFixture();
        var old = fixture.Photo("旧い 写真.PNG", "2024-01-01T10:00:00Z",
            "Old World", "Alice", true);
        var current = fixture.Photo("ใหม่.png", "2025-01-01T10:00:00Z",
            "New World", "Bob", true);
        var plain = fixture.Photo("plain.png", "2023-01-01T10:00:00Z", null, null, false);
        var digest = SHA256.HashData(File.ReadAllBytes(current));

        var first = fixture.Page(limit: 1);
        Assert.Single(first.Items);
        Assert.Equal(current, first.Items[0].FilePath);
        Assert.True(first.HasMore);
        Assert.Equal("metadata", first.Items[0].Status);
        Assert.Equal("metadata", first.Items[0].TimeSource);
        Assert.Equal("New World", first.Items[0].World?.Name);
        var cacheWrites = fixture.Database.CacheWriteCount;
        Assert.Equal("New World", fixture.Page(limit: 1).Items.Single().World?.Name);
        Assert.Equal(cacheWrites, fixture.Database.CacheWriteCount);
        ScreenshotHelper.ClearMemoryCache();
        Assert.Equal("New World", fixture.Page(limit: 1).Items.Single().World?.Name);
        Assert.Equal(cacheWrites, fixture.Database.CacheWriteCount);
        Assert.Equal(current, ScreenshotHelper.GetCachedOrParseMetadata(current, fixture.Database)?.SourceFile);
        Assert.Contains(ScreenshotHelper.FindScreenshots("", fixture.Root,
            ScreenshotHelper.ScreenshotSearchType.Username, fixture.Database), image => image.SourceFile == old);
        var second = fixture.Page(beforeTime: long.Parse(first.NextTime), beforePath: first.NextPath, limit: 1);
        Assert.Equal(old, second.Items.Single().FilePath);
        Assert.Equal("Alice", second.Items.Single().Players.Single().DisplayName);
        Assert.Equal("missing_metadata", fixture.Page(search: "", from: "2022-01-01T00:00:00Z",
            to: "2023-12-31T23:59:59Z").Items.Single().Status);
        Assert.Equal(old, fixture.Page(search: "Alice").Items.Single().FilePath);
        Assert.Equal(current, fixture.Page(search: "New World").Items.Single().FilePath);
        Assert.Empty(fixture.Page(search: "not here").Items);
        Assert.Equal(digest, SHA256.HashData(File.ReadAllBytes(current)));
        Assert.False(File.Exists(Path.Combine(fixture.Root, "photoLibrary.db")));
        Assert.NotNull(await ScreenshotPhotoLibrary.GetThumbnailAsync(fixture.Root, current, 128));
        Assert.Null(await ScreenshotPhotoLibrary.GetThumbnailAsync(fixture.Root, Path.Combine(Path.GetTempPath(), "outside.png"), 128));
    }

    [Fact]
    public void ChangedAndReplacedFilesInvalidatePositiveAndNegativeEntries()
    {
        using var fixture = new PhotoFixture();
        var path = fixture.Photo("changed.png", "2025-01-01T10:00:00Z", null, null, false);
        Assert.Equal("missing_metadata", fixture.Page().Items.Single().Status);
        fixture.AddMetadata(path, "First", "Alice");
        Assert.Equal("First", fixture.Page().Items.Single().World?.Name);
        Assert.NotNull(fixture.Database.GetFileCache(path));
        Assert.Equal("First", fixture.Page().Items.Single().World?.Name);

        File.Delete(path);
        fixture.Photo("changed.png", "2026-01-01T10:00:00Z", "Second", "Bob", true);
        Assert.Equal("Second", fixture.Page(refresh: true).Items.Single().World?.Name);
        File.Delete(path);
        Assert.Empty(fixture.Page(refresh: true).Items);
        Assert.Null(fixture.Database.GetFileCache(path));
    }

    [Fact]
    public void MovingAFileRemovesTheOldIndexAndCacheEntry()
    {
        using var fixture = new PhotoFixture();
        var old = fixture.Photo("old.png", "2025-01-01T10:00:00Z", "World", "Alice", true);
        Assert.Single(fixture.Page().Items);
        var moved = Path.Combine(fixture.Root, "moved.png");
        File.Move(old, moved);
        Assert.Equal(moved, fixture.Page(refresh: true).Items.Single().FilePath);
        Assert.Null(fixture.Database.GetFileCache(old));
    }

    [Fact]
    public void ConcurrentReadersShareOneMetadataParse()
    {
        using var fixture = new PhotoFixture();
        var path = fixture.Photo("shared.png", "2025-01-01T10:00:00Z", "World", "Alice", true);
        System.Threading.Tasks.Parallel.For(0, 12, _ =>
            Assert.Equal("World", ScreenshotHelper.GetCachedOrParseMetadata(path, fixture.Database)?.World.Name));
        Assert.Equal(1, fixture.Database.CacheWriteCount);
    }

    [Fact]
    public void FilteredLargeLibraryStopsAtBoundedScanBudgetAndContinuesFromCursor()
    {
        using var fixture = new PhotoFixture();
        var seed = fixture.Photo("seed.png", "2025-01-01T10:00:00Z", null, null, false);
        for (var i = 0; i < 550; i++)
        {
            var path = Path.Combine(fixture.Root, $"photo-{i:D3}.png");
            File.Copy(seed, path);
            File.SetLastWriteTimeUtc(path, new DateTime(2025, 1, 1, 10, 0, 0, DateTimeKind.Utc).AddSeconds(i));
        }
        File.Delete(seed);
        var first = fixture.Page(search: "no matching world");
        Assert.Empty(first.Items);
        Assert.Equal(500, first.Scanned);
        Assert.True(first.HasMore);
        var second = fixture.Page(search: "no matching world", beforeTime: long.Parse(first.NextTime), beforePath: first.NextPath);
        Assert.Empty(second.Items);
        Assert.Equal(50, second.Scanned);
        Assert.False(second.HasMore);
        Assert.Equal(550, fixture.Database.CacheWriteCount);
    }

    [Fact]
    public void CorruptMetadataAndIncompleteFilesDoNotBreakPage()
    {
        using var fixture = new PhotoFixture();
        var broken = fixture.Photo("broken.png", "2025-01-01T10:00:00Z", null, null, false);
        fixture.AddRawMetadata(broken, "{invalid JSON}");
        var incomplete = Path.Combine(fixture.Root, "incomplete.png");
        File.WriteAllBytes(incomplete, new byte[] { 1, 2, 3 });
        File.SetLastWriteTimeUtc(incomplete, DateTime.UtcNow);
        var page = fixture.Page();
        Assert.Equal(2, page.Items.Count);
        Assert.All(page.Items, item => Assert.Equal("invalid_metadata", item.Status));
        Assert.Equal(2, fixture.Page().Items.Count);
    }

    [Fact]
    public void LegacyLfsMetadataUsesTheExistingParser()
    {
        using var fixture = new PhotoFixture();
        var path = fixture.Photo("legacy.png", "2024-01-01T10:00:00Z", null, null, false);
        fixture.AddRawMetadata(path,
            "lfs|2|author:usr_owner,Old name|world:wrld_old,123,Old world|players:usr_a,0,0,0,Historical name");
        var item = fixture.Page().Items.Single();
        Assert.Equal("metadata", item.Status);
        Assert.Equal("Old world", item.World?.Name);
        Assert.Equal("Historical name", item.Players.Single().DisplayName);
    }

    private sealed class PhotoFixture : IDisposable
    {
        public string Root { get; } = Path.Combine(Path.GetTempPath(), "bettervrcx-library-" + Guid.NewGuid());
        public ScreenshotMetadataDatabase Database { get; }

        public PhotoFixture()
        {
            Directory.CreateDirectory(Root);
            Database = new ScreenshotMetadataDatabase(Path.Combine(Root, "metadataCache.db"));
        }

        public string Photo(string name, string modified, string? world, string? player, bool metadata)
        {
            var path = Path.Combine(Root, name);
            using (var image = new Image<Rgba32>(2, 2)) image.SaveAsPng(path);
            if (metadata) AddMetadata(path, world!, player!);
            File.SetLastWriteTimeUtc(path, DateTime.Parse(modified).ToUniversalTime());
            return path;
        }

        public void AddMetadata(string path, string world, string player)
        {
            Assert.True(ScreenshotHelper.WriteVRCXMetadata(JsonConvert.SerializeObject(new ScreenshotMetadata
            {
                Timestamp = new DateTime(2025, 1, 1, 10, 0, 0, DateTimeKind.Utc),
                World = new ScreenshotMetadata.WorldDetail { Id = "wrld_test", Name = world, InstanceId = "wrld_test:123" },
                Players = new() { new ScreenshotMetadata.PlayerDetail { Id = "usr_test", DisplayName = player } }
            }), path, Database));
        }

        public void AddRawMetadata(string path, string text)
        {
            using var png = new PNGFile(path, true);
            Assert.True(png.WriteChunk(PNGHelper.GenerateTextChunk("Description", text)));
        }

        public ScreenshotPhotoLibrary.Page Page(string search = "", string? from = null, string? to = null,
            long beforeTime = long.MaxValue, string beforePath = "", int limit = 30, bool refresh = false) =>
            ScreenshotPhotoLibrary.GetPage(Root, search, from, to, beforeTime, beforePath, limit, refresh, Database);

        public void Dispose()
        {
            Database.Close();
            SQLiteConnection.ClearAllPools();
            Directory.Delete(Root, true);
        }
    }
}
