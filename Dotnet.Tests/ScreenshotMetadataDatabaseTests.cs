using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using VRCX;
using Xunit;

public class ScreenshotMetadataDatabaseTests
{
    [Fact]
    public void MigratesLegacyCacheAndKeepsOnePhotoIndexInTheSameDatabase()
    {
        var directory = Path.Combine(Path.GetTempPath(), "bettervrcx-photo-test-" + Guid.NewGuid());
        Directory.CreateDirectory(directory);
        var dbPath = Path.Combine(directory, "metadataCache.db");
        try
        {
            using (var connection = new SQLiteConnection($"Data Source={dbPath};Version=3;"))
            {
                connection.Open();
                using var command = new SQLiteCommand(@"CREATE TABLE cache (
                    id INTEGER PRIMARY KEY AUTOINCREMENT, file_path TEXT NOT NULL UNIQUE,
                    metadata TEXT, cached_at INTEGER NOT NULL);
                    INSERT INTO cache (file_path, metadata, cached_at) VALUES ('old.png', '{}', 1);", connection);
                command.ExecuteNonQuery();
            }

            for (var attempt = 0; attempt < 2; attempt++)
            {
                var db = new ScreenshotMetadataDatabase(dbPath);
                var old = db.GetFileCache("old.png");
                Assert.NotNull(old);
                Assert.Equal(attempt == 0 ? -1 : 100, old.FileLength);
                Assert.Equal(attempt == 0 ? -1 : 300, old.CreationTicks);
                Assert.Equal(attempt == 0 ? 0 : 1, old.ParseState);

                db.SaveFileCache("old.png", 100, 200, 300, 1, "{\"version\":1}", null);
                Assert.Equal(100, db.GetFileCache("old.png")!.FileLength);
                db.SyncPhotoIndex("root", new[]
                {
                    new ScreenshotMetadataDatabase.PhotoIndexEntry("new.png", 300),
                    new ScreenshotMetadataDatabase.PhotoIndexEntry("old.png", 200)
                });
                Assert.Equal("new.png", db.GetPhotoPage("root", long.MaxValue, "", 1)[0].FilePath);
                db.SyncPhotoIndex("root", new[]
                {
                    new ScreenshotMetadataDatabase.PhotoIndexEntry("old.png", 200)
                });
                Assert.Single(db.GetPhotoPage("root", long.MaxValue, "", 10));
                db.Close();
            }
        }
        finally
        {
            SQLiteConnection.ClearAllPools();
            Directory.Delete(directory, true);
        }
    }
}
