using System;
using System.Data.SQLite;
using System.IO;
using VRCX.DatabaseBackup;
using Xunit;

namespace BetterVRCX.Tests;

public sealed class DatabaseBackupServiceTests
{
    [Fact]
    public void CreateSnapshot_uses_sqlite_backup_and_removes_credentials()
    {
        using var fixture = TestDatabase.Create();
        var backupPath = Path.Combine(fixture.DirectoryPath, "backup.sqlite3");

        var result = DatabaseBackupService.CreateSnapshot(
            fixture.Connection,
            backupPath,
            new DatabaseBackupMetadata(
                DateTimeOffset.UtcNow,
                "3.2.0",
                "TEST-PC",
                16));

        Assert.True(File.Exists(backupPath));
        Assert.Equal(backupPath, result.Path);
        Assert.True(result.Size > 0);
        Assert.Equal("World A", TestDatabase.ScalarText(backupPath, "SELECT name FROM favorite_world WHERE id = 'wrld_a'"));
        Assert.Equal(0, TestDatabase.ScalarInt(backupPath, "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'cookies'"));
        Assert.Equal(0, TestDatabase.ScalarInt(backupPath, "SELECT COUNT(*) FROM configs WHERE key = 'config:savedcredentials'"));
        Assert.Equal("ok", TestDatabase.ScalarText(backupPath, "PRAGMA integrity_check"));
    }

    [Fact]
    public void Validate_rejects_corrupt_backup()
    {
        using var fixture = TestDatabase.Create();
        var backupPath = Path.Combine(fixture.DirectoryPath, "corrupt.sqlite3");
        File.WriteAllText(backupPath, "this is not sqlite");

        var result = DatabaseBackupService.Validate(backupPath, supportedSchemaVersion: 16);

        Assert.False(result.IsValid);
        Assert.False(result.IsCompatible);
    }

    [Fact]
    public void Validate_rejects_newer_schema_without_opening_it_for_restore()
    {
        using var fixture = TestDatabase.Create(schemaVersion: 17);
        var backupPath = Path.Combine(fixture.DirectoryPath, "newer.sqlite3");
        File.Copy(fixture.DatabasePath, backupPath);

        var result = DatabaseBackupService.Validate(backupPath, supportedSchemaVersion: 16);

        Assert.True(result.IsValid);
        Assert.False(result.IsCompatible);
        Assert.Equal(17, result.SchemaVersion);
    }

    [Fact]
    public void Replace_validates_first_and_keeps_current_database_when_backup_is_corrupt()
    {
        using var fixture = TestDatabase.Create();
        var corruptBackupPath = Path.Combine(fixture.DirectoryPath, "corrupt.sqlite3");
        var recoveryPath = Path.Combine(fixture.DirectoryPath, "recovery.sqlite3");
        File.WriteAllText(corruptBackupPath, "not a database");

        var result = DatabaseBackupService.Replace(
            fixture.DatabasePath,
            corruptBackupPath,
            recoveryPath,
            supportedSchemaVersion: 16);

        Assert.False(result.Success);
        Assert.Equal("World A", TestDatabase.ScalarText(fixture.DatabasePath, "SELECT name FROM favorite_world WHERE id = 'wrld_a'"));
        Assert.False(File.Exists(recoveryPath));
    }

    [Fact]
    public void Replace_creates_recovery_copy_before_swapping_valid_backup()
    {
        using var current = TestDatabase.Create(worldName: "Current World");
        using var source = TestDatabase.Create(worldName: "Backed Up World");
        var backupPath = Path.Combine(current.DirectoryPath, "backup.sqlite3");
        var recoveryPath = Path.Combine(current.DirectoryPath, "recovery.sqlite3");

        DatabaseBackupService.CreateSnapshot(
            source.Connection,
            backupPath,
            new DatabaseBackupMetadata(DateTimeOffset.UtcNow, "3.2.0", "TEST-PC", 16));

        current.Connection.Close();

        var result = DatabaseBackupService.Replace(
            current.DatabasePath,
            backupPath,
            recoveryPath,
            supportedSchemaVersion: 16);

        Assert.True(result.Success, result.Error);
        Assert.Equal(recoveryPath, result.RecoveryPath);
        Assert.Equal("Backed Up World", TestDatabase.ScalarText(current.DatabasePath, "SELECT name FROM favorite_world WHERE id = 'wrld_a'"));
        Assert.Equal("Current World", TestDatabase.ScalarText(recoveryPath, "SELECT name FROM favorite_world WHERE id = 'wrld_a'"));
        Assert.Equal("ok", TestDatabase.ScalarText(current.DatabasePath, "PRAGMA integrity_check"));
        Assert.Equal("ok", TestDatabase.ScalarText(recoveryPath, "PRAGMA integrity_check"));
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

        public static TestDatabase Create(string worldName = "World A", int schemaVersion = 16)
        {
            var directoryPath = Path.Combine(Path.GetTempPath(), "BetterVRCX-tests", Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(directoryPath);
            var databasePath = Path.Combine(directoryPath, "VRCX.sqlite3");
            var connection = new SQLiteConnection($"Data Source={databasePath};Version=3;");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = """
                CREATE TABLE configs (key TEXT PRIMARY KEY, value TEXT);
                CREATE TABLE favorite_world (id TEXT PRIMARY KEY, name TEXT NOT NULL);
                CREATE TABLE cookies (name TEXT PRIMARY KEY, value TEXT);
                INSERT INTO configs (key, value) VALUES ('config:vrcx_databaseversion', $version);
                INSERT INTO configs (key, value) VALUES ('config:savedcredentials', 'secret');
                INSERT INTO favorite_world (id, name) VALUES ('wrld_a', $worldName);
                INSERT INTO cookies (name, value) VALUES ('session', 'secret');
                """;
            command.Parameters.AddWithValue("$version", schemaVersion.ToString());
            command.Parameters.AddWithValue("$worldName", worldName);
            command.ExecuteNonQuery();
            return new TestDatabase(directoryPath, databasePath, connection);
        }

        public static string ScalarText(string databasePath, string sql)
        {
            using var connection = new SQLiteConnection($"Data Source={databasePath};Version=3;Read Only=True;");
            connection.Open();
            using var command = connection.CreateCommand();
            command.CommandText = sql;
            return Convert.ToString(command.ExecuteScalar()) ?? string.Empty;
        }

        public static int ScalarInt(string databasePath, string sql)
        {
            return Convert.ToInt32(ScalarText(databasePath, sql));
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
                // Test cleanup must not hide the assertion that failed.
            }
        }
    }
}
