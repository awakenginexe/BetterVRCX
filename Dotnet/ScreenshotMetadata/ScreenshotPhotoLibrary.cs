#nullable enable
using System;
using System.Collections.Generic;
using System.IO;
using System.Globalization;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Jpeg;
using SixLabors.ImageSharp.Processing;

namespace VRCX;

internal static class ScreenshotPhotoLibrary
{
    private static readonly object IndexLock = new();
    private static readonly HashSet<string> IndexedRoots = new(
        OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal);
    private static readonly SemaphoreSlim ThumbnailSlots = new(2, 2);

    internal sealed class Page
    {
        public List<Item> Items { get; set; } = new();
        public string NextTime { get; set; } = "";
        public string NextPath { get; set; } = "";
        public bool HasMore { get; set; }
        public int Scanned { get; set; }
    }

    internal sealed class Item
    {
        public string FilePath { get; set; } = "";
        public string FileName { get; set; } = "";
        public long FileLength { get; set; }
        public long LastWriteTicks { get; set; }
        public string FileModifiedUtc { get; set; } = "";
        public string? Timestamp { get; set; }
        public string? HistoryTimeUtc { get; set; }
        public string TimeSource { get; set; } = "file_modified";
        public string Status { get; set; } = "missing_metadata";
        public string? Error { get; set; }
        public ScreenshotMetadata.WorldDetail? World { get; set; }
        public ScreenshotMetadata.AuthorDetail? Author { get; set; }
        public List<ScreenshotMetadata.PlayerDetail> Players { get; set; } = new();
    }

    private static IEnumerable<ScreenshotMetadataDatabase.PhotoIndexEntry> EnumeratePhotos(string root)
    {
        if (!Directory.Exists(root)) yield break;
        var options = new EnumerationOptions
        {
            RecurseSubdirectories = true,
            IgnoreInaccessible = true
        };
        foreach (var path in Directory.EnumerateFiles(root, "*", options))
        {
            if (!path.EndsWith(".png", StringComparison.OrdinalIgnoreCase)) continue;
            ScreenshotMetadataDatabase.PhotoIndexEntry? entry = null;
            try
            {
                var file = new FileInfo(path);
                entry = new ScreenshotMetadataDatabase.PhotoIndexEntry(
                    Path.GetFullPath(path), file.LastWriteTimeUtc.Ticks);
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
            if (entry != null) yield return entry;
        }
    }

    private static void EnsureIndexed(string root, bool refresh, ScreenshotMetadataDatabase database)
    {
        lock (IndexLock)
        {
            if (!refresh && IndexedRoots.Contains(root)) return;
            database.SyncPhotoIndex(root, EnumeratePhotos(root));
            IndexedRoots.Add(root);
        }
    }

    internal static Page GetPage(string directory, string? search, string? from, string? to,
        long beforeTime, string? beforePath, int requestedLimit, bool refresh,
        ScreenshotMetadataDatabase? testDatabase = null)
    {
        var root = Path.GetFullPath(directory);
        var database = testDatabase ?? ScreenshotHelper.Database;
        EnsureIndexed(root, refresh, database);
        var limit = Math.Clamp(requestedLimit, 1, 60);
        var term = (search ?? "").Trim();
        var hasFrom = DateTimeOffset.TryParse(from, out var fromDate);
        var hasTo = DateTimeOffset.TryParse(to, out var toDate);
        var page = new Page { NextTime = beforeTime.ToString(CultureInfo.InvariantCulture), NextPath = beforePath ?? "", HasMore = true };
        const int scanBudget = 500;
        while (page.Items.Count < limit && page.Scanned < scanBudget)
        {
            var count = Math.Min(64, scanBudget - page.Scanned);
            var rows = database.GetPhotoPage(root, long.Parse(page.NextTime, CultureInfo.InvariantCulture), page.NextPath, count);
            if (rows.Count == 0) { page.HasMore = false; break; }
            var processed = 0;
            foreach (var row in rows)
            {
                processed++;
                page.Scanned++;
                page.NextTime = row.FileTimeTicks.ToString(CultureInfo.InvariantCulture);
                page.NextPath = row.FilePath;
                var item = ReadItem(row.FilePath, database, refresh);
                if (item == null) continue;
                if (!Matches(item, term, hasFrom ? fromDate : null, hasTo ? toDate : null)) continue;
                page.Items.Add(item);
                if (page.Items.Count == limit) break;
            }
            if (rows.Count < count && processed == rows.Count) { page.HasMore = false; break; }
        }
        return page;
    }

    private static Item? ReadItem(string path, ScreenshotMetadataDatabase database, bool refresh)
    {
        var item = new Item { FilePath = path, FileName = Path.GetFileName(path) };
        FileInfo file;
        try
        {
            file = new FileInfo(path);
            if (!file.Exists) { item.Status = "missing_file"; return item; }
            item.FileLength = file.Length;
            item.LastWriteTicks = file.LastWriteTimeUtc.Ticks;
            item.FileModifiedUtc = file.LastWriteTimeUtc.ToString("o");
        }
        catch (IOException) { item.Status = "unavailable"; return item; }
        catch (UnauthorizedAccessException) { item.Status = "unavailable"; return item; }

        var metadata = ScreenshotHelper.GetCachedOrParseMetadata(path, database, refresh);
        if (metadata == null) { item.Status = "missing_file"; return item; }
        if (metadata.Error != null)
        {
            item.Status = metadata.Error == "Image has no valid metadata." ? "missing_metadata" : "invalid_metadata";
            item.Error = metadata.Error;
            return item;
        }
        item.Status = "metadata";
        item.World = metadata.World;
        item.Author = metadata.Author;
        item.Players = metadata.Players ?? new();
        if (metadata.Timestamp is DateTime timestamp)
        {
            item.Timestamp = timestamp.ToString("o");
            item.TimeSource = "metadata";
            if (timestamp.Kind != DateTimeKind.Unspecified)
                item.HistoryTimeUtc = timestamp.ToUniversalTime().ToString("o");
        }
        return item;
    }

    private static bool Matches(Item item, string term, DateTimeOffset? from, DateTimeOffset? to)
    {
        if (term.Length > 0 && !new[] { item.World?.Name, item.World?.Id, item.Author?.DisplayName, item.Author?.Id }
            .Concat(item.Players.SelectMany(player => new[] { player.DisplayName, player.Id }))
            .Any(value => value?.Contains(term, StringComparison.OrdinalIgnoreCase) == true)) return false;

        if (from == null && to == null) return true;
        if (!DateTimeOffset.TryParse(item.Timestamp ?? item.FileModifiedUtc, out var date)) return false;
        return (from == null || date >= from) && (to == null || date <= to);
    }

    internal static async Task<string?> GetThumbnailAsync(string directory, string path, int size)
    {
        var root = Path.GetFullPath(directory);
        var fullPath = Path.GetFullPath(path);
        var relative = Path.GetRelativePath(root, fullPath);
        if (relative == ".." || relative.StartsWith(".." + Path.DirectorySeparatorChar, StringComparison.Ordinal) || Path.IsPathRooted(relative) ||
            !fullPath.EndsWith(".png", StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath)) return null;
        await ThumbnailSlots.WaitAsync();
        try
        {
            return await Task.Run(() =>
            {
                using var image = Image.Load(fullPath);
                image.Mutate(x => x.Resize(new ResizeOptions
                {
                    Size = new Size(Math.Clamp(size, 64, 512), Math.Clamp(size, 64, 512)),
                    Mode = ResizeMode.Max
                }));
                using var stream = new MemoryStream();
                image.SaveAsJpeg(stream, new JpegEncoder { Quality = 72 });
                return "data:image/jpeg;base64," + Convert.ToBase64String(stream.ToArray());
            });
        }
        catch (Exception) { return null; }
        finally { ThumbnailSlots.Release(); }
    }
}
