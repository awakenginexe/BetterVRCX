using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.Threading;

namespace VRCX
{
    public class MetadataCache
    {
        public int Id { get; set; }
        public string FilePath { get; set; }
        public string? Metadata { get; set; }
        public DateTimeOffset CachedAt { get; set; }
    }

    // Imagine using SQLite to store json strings in one table lmao
    // Couldn't be me... oh wait
    internal class ScreenshotMetadataDatabase
    {
        private readonly SQLiteConnection _sqlite;
        private readonly object _sync = new();
        private long _cacheWriteCount;
        internal long CacheWriteCount => Interlocked.Read(ref _cacheWriteCount);

        internal record FileCacheEntry(string? Metadata, long FileLength, long LastWriteTicks, long CreationTicks, int ParseState, string? Error);
        internal record PhotoIndexEntry(string FilePath, long FileTimeTicks);

        public ScreenshotMetadataDatabase(string databaseLocation)
        {
            _sqlite = new SQLiteConnection($"Data Source=\"{databaseLocation}\";Version=3;PRAGMA locking_mode=NORMAL;PRAGMA busy_timeout=5000;PRAGMA journal_mode=WAL;PRAGMA optimize=0x10002;", true);
            _sqlite.Open();
            using var cmd = new SQLiteCommand(_sqlite);
            cmd.CommandText = @"CREATE TABLE IF NOT EXISTS cache (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    file_path TEXT NOT NULL UNIQUE,
                                    metadata TEXT,
                                    cached_at INTEGER NOT NULL
                                );";
            cmd.ExecuteNonQuery();

            // Existing metadataCache.db owns both parsed metadata and the photo file index.
            using var migration = _sqlite.BeginTransaction();
            var columns = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
            using (var info = new SQLiteCommand("PRAGMA table_info(cache);", _sqlite, migration))
            using (var reader = info.ExecuteReader())
                while (reader.Read()) columns.Add(reader.GetString(1));
            foreach (var (name, definition) in new[]
            {
                ("file_length", "INTEGER NOT NULL DEFAULT -1"),
                ("last_write_ticks", "INTEGER NOT NULL DEFAULT -1"),
                ("creation_ticks", "INTEGER NOT NULL DEFAULT -1"),
                ("parse_state", "INTEGER NOT NULL DEFAULT 0"),
                ("parse_error", "TEXT")
            })
            {
                if (columns.Contains(name)) continue;
                using var alter = new SQLiteCommand($"ALTER TABLE cache ADD COLUMN {name} {definition};", _sqlite, migration);
                alter.ExecuteNonQuery();
            }
            using (var index = new SQLiteCommand(@"CREATE TABLE IF NOT EXISTS photo_index (
                    file_path TEXT PRIMARY KEY,
                    photo_root TEXT NOT NULL,
                    file_time_ticks INTEGER NOT NULL,
                    scan_id INTEGER NOT NULL
                );
                CREATE INDEX IF NOT EXISTS photo_index_page
                    ON photo_index(photo_root, file_time_ticks DESC, file_path DESC);", _sqlite, migration))
                index.ExecuteNonQuery();
            migration.Commit();
        }

        internal FileCacheEntry? GetFileCache(string filePath)
        {
            lock (_sync)
            {
                using var command = new SQLiteCommand(
                    "SELECT metadata, file_length, last_write_ticks, creation_ticks, parse_state, parse_error FROM cache WHERE file_path = @path ORDER BY id DESC LIMIT 1;", _sqlite);
                command.Parameters.AddWithValue("@path", filePath);
                using var reader = command.ExecuteReader();
                if (!reader.Read()) return null;
                return new FileCacheEntry(
                    reader.IsDBNull(0) ? null : reader.GetString(0),
                    reader.GetInt64(1), reader.GetInt64(2), reader.GetInt64(3), reader.GetInt32(4),
                    reader.IsDBNull(5) ? null : reader.GetString(5));
            }
        }

        internal void SaveFileCache(string filePath, long length, long lastWriteTicks, long creationTicks, int state, string? metadata, string? error)
        {
            lock (_sync)
            {
                using var update = new SQLiteCommand(@"UPDATE cache SET metadata=@metadata, cached_at=@cachedAt,
                    file_length=@length, last_write_ticks=@lastWrite, creation_ticks=@created, parse_state=@state, parse_error=@error
                    WHERE file_path=@path;", _sqlite);
                update.Parameters.AddWithValue("@path", filePath);
                update.Parameters.AddWithValue("@metadata", (object?)metadata ?? DBNull.Value);
                update.Parameters.AddWithValue("@cachedAt", DateTimeOffset.UtcNow.Ticks);
                update.Parameters.AddWithValue("@length", length);
                update.Parameters.AddWithValue("@lastWrite", lastWriteTicks);
                update.Parameters.AddWithValue("@created", creationTicks);
                update.Parameters.AddWithValue("@state", state);
                update.Parameters.AddWithValue("@error", (object?)error ?? DBNull.Value);
                if (update.ExecuteNonQuery() != 0)
                {
                    Interlocked.Increment(ref _cacheWriteCount);
                    return;
                }
                using var insert = new SQLiteCommand(@"INSERT INTO cache
                    (file_path, metadata, cached_at, file_length, last_write_ticks, creation_ticks, parse_state, parse_error)
                    VALUES (@path, @metadata, @cachedAt, @length, @lastWrite, @created, @state, @error);", _sqlite);
                foreach (SQLiteParameter parameter in update.Parameters)
                    insert.Parameters.AddWithValue(parameter.ParameterName, parameter.Value);
                insert.ExecuteNonQuery();
                Interlocked.Increment(ref _cacheWriteCount);
            }
        }

        internal void InvalidateFile(string filePath)
        {
            lock (_sync)
            {
                using var command = new SQLiteCommand("UPDATE cache SET last_write_ticks=-1 WHERE file_path=@path;", _sqlite);
                command.Parameters.AddWithValue("@path", filePath);
                command.ExecuteNonQuery();
            }
        }

        internal void SyncPhotoIndex(string root, IEnumerable<PhotoIndexEntry> files)
        {
            lock (_sync)
            {
                using var transaction = _sqlite.BeginTransaction();
                var scanId = DateTime.UtcNow.Ticks;
                using var command = new SQLiteCommand(@"INSERT OR REPLACE INTO photo_index
                    (file_path, photo_root, file_time_ticks, scan_id) VALUES (@path, @root, @time, @scan);", _sqlite, transaction);
                var pathParameter = command.Parameters.Add("@path", System.Data.DbType.String);
                command.Parameters.AddWithValue("@root", root);
                var timeParameter = command.Parameters.Add("@time", System.Data.DbType.Int64);
                command.Parameters.AddWithValue("@scan", scanId);
                foreach (var file in files)
                {
                    pathParameter.Value = file.FilePath;
                    timeParameter.Value = file.FileTimeTicks;
                    command.ExecuteNonQuery();
                }
                using var removeMissingCache = new SQLiteCommand(@"DELETE FROM cache WHERE file_path IN
                    (SELECT file_path FROM photo_index WHERE photo_root=@root AND scan_id<>@scan);", _sqlite, transaction);
                removeMissingCache.Parameters.AddWithValue("@root", root);
                removeMissingCache.Parameters.AddWithValue("@scan", scanId);
                removeMissingCache.ExecuteNonQuery();
                using var prune = new SQLiteCommand(@"DELETE FROM photo_index
                    WHERE photo_root=@root AND scan_id<>@scan;", _sqlite, transaction);
                prune.Parameters.AddWithValue("@root", root);
                prune.Parameters.AddWithValue("@scan", scanId);
                prune.ExecuteNonQuery();
                transaction.Commit();
            }
        }

        internal List<PhotoIndexEntry> GetPhotoPage(string root, long beforeTime, string beforePath, int limit)
        {
            lock (_sync)
            {
                var result = new List<PhotoIndexEntry>();
                using var command = new SQLiteCommand(@"SELECT file_path, file_time_ticks FROM photo_index
                    WHERE photo_root=@root AND
                      (file_time_ticks < @time OR (file_time_ticks = @time AND file_path < @path))
                    ORDER BY file_time_ticks DESC, file_path DESC LIMIT @limit;", _sqlite);
                command.Parameters.AddWithValue("@root", root);
                command.Parameters.AddWithValue("@time", beforeTime);
                command.Parameters.AddWithValue("@path", beforePath);
                command.Parameters.AddWithValue("@limit", limit);
                using var reader = command.ExecuteReader();
                while (reader.Read()) result.Add(new PhotoIndexEntry(reader.GetString(0), reader.GetInt64(1)));
                return result;
            }
        }

        public void AddMetadataCache(string filePath, string metadata)
        {
            // old table schema didn't have filePath as unique
            var isFileCached = IsFileCached(filePath);
            if (isFileCached != -1)
                return;

            var cache = new MetadataCache()
            {
                FilePath = filePath,
                Metadata = metadata,
                CachedAt = DateTimeOffset.Now
            };
            const string sql = "INSERT OR REPLACE INTO cache (file_path, metadata, cached_at) VALUES (@FilePath, @Metadata, @CachedAt);";
            using var command = new SQLiteCommand(sql, _sqlite);
            command.Parameters.AddWithValue("@FilePath", cache.FilePath);
            command.Parameters.AddWithValue("@Metadata", cache.Metadata);
            command.Parameters.AddWithValue("@CachedAt", cache.CachedAt.Ticks);
            command.ExecuteNonQuery();
        }

        public void BulkAddMetadataCache(IEnumerable<MetadataCache> cache)
        {
            using var transaction = _sqlite.BeginTransaction();
            using var command = new SQLiteCommand(_sqlite);
            const string sql = "INSERT OR REPLACE INTO cache (file_path, metadata, cached_at) VALUES (@FilePath, @Metadata, @CachedAt);";
            command.CommandText = sql;
            var filePathParam = command.Parameters.Add("@FilePath", System.Data.DbType.String);
            var metadataParam = command.Parameters.Add("@Metadata", System.Data.DbType.String);
            var cachedAtParam = command.Parameters.Add("@CachedAt", System.Data.DbType.Int64);
            foreach (var item in cache)
            {
                var isFileCached = IsFileCached(item.FilePath);
                if (isFileCached != -1)
                    continue;

                filePathParam.Value = item.FilePath;
                metadataParam.Value = item.Metadata;
                cachedAtParam.Value = item.CachedAt.Ticks;
                command.ExecuteNonQuery();
            }
            transaction.Commit();
        }

        public int IsFileCached(string filePath)
        {
            const string sql = "SELECT id FROM cache WHERE file_path = @FilePath;";
            using var command = new SQLiteCommand(sql, _sqlite);
            command.Parameters.AddWithValue("@FilePath", filePath);
            using var reader = command.ExecuteReader();
            var result = new List<int>();
            while (reader.Read())
            {
                result.Add(reader.GetInt32(0));
            }
            if (result.Count > 0)
            {
                return result[0];
            }
            return -1;
        }

        public string? GetMetadata(string filePath)
        {
            const string sql = "SELECT id, file_path, metadata, cached_at FROM cache WHERE file_path = @FilePath;";
            using var command = new SQLiteCommand(sql, _sqlite);
            command.Parameters.AddWithValue("@FilePath", filePath);
            using var reader = command.ExecuteReader();
            var result = new List<MetadataCache>();
            while (reader.Read())
            {
                result.Add(new MetadataCache()
                {
                    Id = reader.GetInt32(0),
                    FilePath = reader.GetString(1),
                    Metadata = reader.IsDBNull(2) ? null : reader.GetString(2),
                    CachedAt = new DateTime(reader.GetInt64(3))
                });
            }
            if (result.Count > 0)
            {
                return result[0].Metadata;
            }
            return null;
        }

        public string? GetMetadataById(int id)
        {
            const string sql = "SELECT id, file_path, metadata, cached_at FROM cache WHERE id = @Id;";
            using var command = new SQLiteCommand(sql, _sqlite);
            command.Parameters.AddWithValue("@Id", id);
            using var reader = command.ExecuteReader();
            var result = new List<MetadataCache>();
            while (reader.Read())
            {
                result.Add(new MetadataCache()
                {
                    Id = reader.GetInt32(0),
                    FilePath = reader.GetString(1),
                    Metadata = reader.IsDBNull(2) ? null : reader.GetString(2),
                    CachedAt = new DateTime(reader.GetInt64(3))
                });
            }
            if (result.Count > 0)
            {
                return result[0].Metadata;
            }
            return null;
        }

        public void Close()
        {
            _sqlite.Close();
        }
    }
}
