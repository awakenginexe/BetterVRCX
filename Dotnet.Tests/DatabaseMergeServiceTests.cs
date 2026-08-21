using System;
using System.Data.SQLite;
using System.IO;
using Xunit;
using VRCX.DatabaseBackup;

namespace BetterVRCX.Tests;

public sealed class DatabaseMergeServiceTests
{
    [Fact]
    public void Merge_preserves_favorites_memos_and_overlapping_history_without_prompting()
    {
        using var current = TestDatabase.Create("Current World", "local note", "2026-08-19T10:00:00.000+00:00");
        using var backup = TestDatabase.Create("Backup World", "backup note", "2026-08-19T11:00:00.000+00:00");

        TestDatabase.Insert(current.Connection, "INSERT INTO favorite_world (created_at, world_id, group_name) VALUES ('2026-08-19T10:00:00.000+00:00', 'wrld_shared', 'Favorites')");
        TestDatabase.Insert(backup.Connection, "INSERT INTO favorite_world (created_at, world_id, group_name) VALUES ('2026-08-19T11:00:00.000+00:00', 'wrld_shared', 'Favorites')");
        TestDatabase.Insert(current.Connection, "INSERT INTO usr1234567890_feed_gps (created_at, user_id, location) VALUES ('2026-08-19T10:00:00.000+00:00', 'usr_friend', 'wrld_local')");
        TestDatabase.Insert(backup.Connection, "INSERT INTO usr1234567890_feed_gps (created_at, user_id, location) VALUES ('2026-08-19T10:00:00.000+00:00', 'usr_friend', 'wrld_backup')");
        current.Connection.Close();
        backup.Connection.Close();

        var result = DatabaseMergeService.Merge(current.DatabasePath, backup.DatabasePath, supportedSchemaVersion: 16);

        Assert.True(result.Success, result.Error);
        Assert.Equal(1, TestDatabase.ScalarInt(current.DatabasePath, "SELECT COUNT(*) FROM favorite_world WHERE world_id = 'wrld_shared' AND group_name = 'Favorites'"));
        Assert.Equal(1, TestDatabase.ScalarInt(current.DatabasePath, "SELECT COUNT(*) FROM memos WHERE user_id = 'usr_friend'"));
        var mergedMemo = TestDatabase.ScalarText(current.DatabasePath, "SELECT memo FROM memos WHERE user_id = 'usr_friend'");
        Assert.Contains("local note", mergedMemo);
        Assert.Contains("backup note", mergedMemo);
        Assert.Equal(2, TestDatabase.ScalarInt(current.DatabasePath, "SELECT COUNT(*) FROM usr1234567890_feed_gps"));
        Assert.Equal(1, TestDatabase.ScalarInt(current.DatabasePath, "SELECT COUNT(*) FROM usr1234567890_feed_gps WHERE location = 'wrld_local'"));
        Assert.Equal(1, TestDatabase.ScalarInt(current.DatabasePath, "SELECT COUNT(*) FROM usr1234567890_feed_gps WHERE location = 'wrld_backup'"));
    }

    private sealed class TestDatabase : IDisposable
    {
        private TestDatabase(string directoryPath, string databasePath, SQLiteConnection connection)
        {
            DirectoryPath = directoryPath;
            DatabasePath = databasePath;
            Connection = connection;
        }

        public string DirectoryPath { get; }
        public string DatabasePath { get; }
        public SQLiteConnection Connection { get; }

        public static TestDatabase Create(string worldName, string memo, string editedAt)
        {
            var directoryPath = Path.Combine(Path.GetTempPath(), "BetterVRCX-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directoryPath);
            var databasePath = Path.Combine(directoryPath, "VRCX.sqlite3");
            var connection = new SQLiteConnection($"Data Source={databasePath};Version=3;");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE configs (key TEXT PRIMARY KEY, value TEXT);
                CREATE TABLE favorite_world (id INTEGER PRIMARY KEY, created_at TEXT, world_id TEXT, group_name TEXT);
                CREATE TABLE memos (user_id TEXT PRIMARY KEY, edited_at TEXT, memo TEXT);
                CREATE TABLE usr1234567890_feed_gps (id INTEGER PRIMARY KEY, created_at TEXT, user_id TEXT, location TEXT);
                INSERT INTO configs (key, value) VALUES ('config:vrcx_databaseversion', '16');
                INSERT INTO favorite_world (created_at, world_id, group_name) VALUES ('2026-08-19T09:00:00.000+00:00', 'wrld_a', $worldName);
                INSERT INTO memos (user_id, edited_at, memo) VALUES ('usr_friend', $editedAt, $memo);
                """;
            command.Parameters.AddWithValue("$worldName", worldName);
            command.Parameters.AddWithValue("$editedAt", editedAt);
            command.Parameters.AddWithValue("$memo", memo);
            command.ExecuteNonQuery();
            return new TestDatabase(directoryPath, databasePath, connection);
        }

        public static void Insert(SQLiteConnection connection, string sql)
        {
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            command.ExecuteNonQuery();
        }

        public static int ScalarInt(string databasePath, string sql)
        {
            using var connection = new SQLiteConnection($"Data Source={databasePath};Version=3;Read Only=True;");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            return Convert.ToInt32(command.ExecuteScalar());
        }

        public static string ScalarText(string databasePath, string sql)
        {
            using var connection = new SQLiteConnection($"Data Source={databasePath};Version=3;Read Only=True;");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            return Convert.ToString(command.ExecuteScalar()) ?? string.Empty;
        }

        public void Dispose()
        {
            Connection.Dispose();
            try
            {
                Directory.Delete(DirectoryPath, recursive: true);
            }
            catch
            {
            }
        }
    }
}
