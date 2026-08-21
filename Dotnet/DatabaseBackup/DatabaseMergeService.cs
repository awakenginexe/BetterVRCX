using System;
using System.Data.SQLite;
using System.IO;
using DBMerger;
using NLog;

namespace VRCX.DatabaseBackup;

public sealed record DatabaseMergeResult(bool Success, string Error);

public static class DatabaseMergeService
{
    private const string BackupAlias = "cloud_backup";
    private static readonly Logger Logger = LogManager.GetCurrentClassLogger();

    public static DatabaseMergeResult Merge(
        string currentDatabasePath,
        string backupDatabasePath,
        int supportedSchemaVersion)
    {
        var currentPath = Path.GetFullPath(currentDatabasePath);
        var backupPath = Path.GetFullPath(backupDatabasePath);
        if (string.Equals(currentPath, backupPath, StringComparison.OrdinalIgnoreCase))
            return new DatabaseMergeResult(false, "The current database and backup must be different files.");

        var backupValidation = DatabaseBackupService.Validate(backupPath, supportedSchemaVersion);
        if (!backupValidation.IsValid || !backupValidation.IsCompatible)
            return new DatabaseMergeResult(false, backupValidation.Error);

        if (!File.Exists(currentPath))
            return new DatabaseMergeResult(false, "The current database does not exist.");

        var currentValidation = DatabaseBackupService.Validate(currentPath, supportedSchemaVersion);
        if (!currentValidation.IsValid || !currentValidation.IsCompatible)
            return new DatabaseMergeResult(false, "The current database is not compatible with this BetterVRCX version.");

        try
        {
            using var connection = new SQLiteConnection($"Data Source=\"{currentPath}\";Version=3;PRAGMA busy_timeout=5000;PRAGMA journal_mode=WAL;");
            connection.Open();
            return Merge(connection, currentPath, backupPath, supportedSchemaVersion);
        }
        catch (Exception ex) when (ex is SQLiteException or IOException or UnauthorizedAccessException)
        {
            Logger.Error(ex, "Cloud database merge could not open the current database.");
            return new DatabaseMergeResult(false, "The databases could not be merged safely.");
        }
    }

    public static DatabaseMergeResult Merge(
        SQLiteConnection currentConnection,
        string currentDatabasePath,
        string backupDatabasePath,
        int supportedSchemaVersion)
    {
        ArgumentNullException.ThrowIfNull(currentConnection);
        var backupPath = Path.GetFullPath(backupDatabasePath);
        var backupValidation = DatabaseBackupService.Validate(backupPath, supportedSchemaVersion);
        if (!backupValidation.IsValid || !backupValidation.IsCompatible)
            return new DatabaseMergeResult(false, backupValidation.Error);

        var attached = false;
        try
        {
            using var attach = currentConnection.CreateCommand();
            attach.CommandText = "ATTACH DATABASE @path AS cloud_backup";
            attach.Parameters.AddWithValue("@path", backupPath);
            attach.ExecuteNonQuery();
            attached = true;

            var config = new Config(
                currentDatabasePath,
                backupPath,
                debug: false,
                importConfig: false,
                preserveOverlappingData: true,
                preserveConfigValues: false);
            new Merger(currentConnection, BackupAlias, "main", config).Merge();
            return new DatabaseMergeResult(true, string.Empty);
        }
        catch (Exception ex) when (ex is SQLiteException or IOException or UnauthorizedAccessException)
        {
            Logger.Error(ex, "Cloud database merge failed; the transaction should have been rolled back.");
            return new DatabaseMergeResult(false, "The databases could not be merged safely.");
        }
        finally
        {
            if (attached)
            {
                try
                {
                    using var detach = currentConnection.CreateCommand();
                    detach.CommandText = "DETACH DATABASE cloud_backup";
                    detach.ExecuteNonQuery();
                }
                catch
                {
                }
            }
        }
    }
}
