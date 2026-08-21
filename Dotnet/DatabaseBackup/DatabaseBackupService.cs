using System;
using System.Data.SQLite;
using System.Globalization;
using System.IO;

namespace VRCX.DatabaseBackup;

public sealed record DatabaseBackupMetadata(
    DateTimeOffset CreatedAt,
    string ApplicationVersion,
    string DeviceName,
    int SchemaVersion);

public sealed record DatabaseBackupResult(
    string Path,
    long Size,
    DatabaseBackupMetadata Metadata);

public sealed record DatabaseValidationResult(
    bool IsValid,
    bool IsCompatible,
    int SchemaVersion,
    long Size,
    string Error)
{
    public static DatabaseValidationResult Missing(string error) =>
        new(false, false, 0, 0, error);
}

public sealed record DatabaseReplaceResult(
    bool Success,
    string RecoveryPath,
    string Error);

/// <summary>
/// Performs file-level database operations without copying a live SQLite file.
/// Callers that own the application's connection must coordinate the operation
/// with that connection's write lock.
/// </summary>
public static class DatabaseBackupService
{
    private const string DatabaseVersionKey = "config:vrcx_databaseversion";

    public static int GetSchemaVersion(SQLiteConnection connection)
    {
        ArgumentNullException.ThrowIfNull(connection);
        return ReadSchemaVersion(connection);
    }

    public static DatabaseBackupResult CreateSnapshot(
        SQLiteConnection source,
        string destinationPath,
        DatabaseBackupMetadata metadata)
    {
        ArgumentNullException.ThrowIfNull(source);
        ArgumentNullException.ThrowIfNull(metadata);

        var destination = GetFullPath(destinationPath);
        var temporaryPath = CreateTemporaryPath(destination);

        try
        {
            CreateOnlineCopy(source, temporaryPath, stripSensitiveData: true);
            var validation = Validate(temporaryPath, metadata.SchemaVersion);
            if (!validation.IsValid)
                throw new InvalidDataException($"The SQLite snapshot failed validation: {validation.Error}");

            ReplaceFile(temporaryPath, destination);
            return new DatabaseBackupResult(destination, new FileInfo(destination).Length, metadata);
        }
        finally
        {
            DeleteIfExists(temporaryPath);
        }
    }

    public static DatabaseValidationResult Validate(string databasePath, int supportedSchemaVersion)
    {
        if (string.IsNullOrWhiteSpace(databasePath))
            return DatabaseValidationResult.Missing("The backup path is empty.");

        var path = GetFullPath(databasePath);
        if (!File.Exists(path))
            return DatabaseValidationResult.Missing("The backup file does not exist.");

        try
        {
            using var connection = OpenConnection(path, readOnly: true);

            using (var integrityCommand = connection.CreateCommand())
            {
                integrityCommand.CommandText = "PRAGMA integrity_check";
                var integrity = Convert.ToString(integrityCommand.ExecuteScalar(), CultureInfo.InvariantCulture);
                if (!string.Equals(integrity, "ok", StringComparison.OrdinalIgnoreCase))
                {
                    return new DatabaseValidationResult(
                        false,
                        false,
                        0,
                        new FileInfo(path).Length,
                        $"SQLite integrity check failed: {integrity ?? "unknown error"}");
                }
            }

            var schemaVersion = ReadSchemaVersion(connection);
            var compatible = schemaVersion <= supportedSchemaVersion;
            var error = compatible
                ? string.Empty
                : $"The backup schema version ({schemaVersion}) is newer than this BetterVRCX version ({supportedSchemaVersion}).";
            return new DatabaseValidationResult(
                true,
                compatible,
                schemaVersion,
                new FileInfo(path).Length,
                error);
        }
        catch (Exception ex) when (ex is SQLiteException or IOException or UnauthorizedAccessException)
        {
            return new DatabaseValidationResult(false, false, 0, 0, "The backup could not be opened as SQLite.");
        }
    }

    public static DatabaseReplaceResult Replace(
        string currentDatabasePath,
        string backupDatabasePath,
        string recoveryPath,
        int supportedSchemaVersion)
    {
        var currentPath = GetFullPath(currentDatabasePath);
        var backupPath = GetFullPath(backupDatabasePath);
        var recoveryDatabasePath = GetFullPath(recoveryPath);

        if (PathsEqual(currentPath, backupPath) ||
            PathsEqual(currentPath, recoveryDatabasePath) ||
            PathsEqual(backupPath, recoveryDatabasePath))
            return new DatabaseReplaceResult(false, recoveryDatabasePath, "The current, backup, and recovery paths must be different.");

        var backupValidation = Validate(backupPath, supportedSchemaVersion);
        if (!backupValidation.IsValid || !backupValidation.IsCompatible)
            return new DatabaseReplaceResult(false, recoveryDatabasePath, backupValidation.Error);

        if (!File.Exists(currentPath))
            return new DatabaseReplaceResult(false, recoveryDatabasePath, "The current database does not exist.");

        var temporaryPath = CreateTemporaryPath(currentPath);
        var swapped = false;
        try
        {
            CreateOnlineCopyFromPath(currentPath, recoveryDatabasePath, stripSensitiveData: false);
            var recoveryValidation = Validate(recoveryDatabasePath, supportedSchemaVersion);
            if (!recoveryValidation.IsValid)
                return new DatabaseReplaceResult(false, recoveryDatabasePath, "The local recovery copy failed validation.");

            File.Copy(backupPath, temporaryPath, overwrite: false);
            var temporaryValidation = Validate(temporaryPath, supportedSchemaVersion);
            if (!temporaryValidation.IsValid || !temporaryValidation.IsCompatible)
                return new DatabaseReplaceResult(false, recoveryDatabasePath, temporaryValidation.Error);

            ReplaceFile(temporaryPath, currentPath);
            swapped = true;
            var restoredValidation = Validate(currentPath, supportedSchemaVersion);
            if (!restoredValidation.IsValid || !restoredValidation.IsCompatible)
            {
                RestoreRecoveryCopy(currentPath, recoveryDatabasePath);
                return new DatabaseReplaceResult(false, recoveryDatabasePath, "The restored database failed validation and the original was restored.");
            }

            return new DatabaseReplaceResult(true, recoveryDatabasePath, string.Empty);
        }
        catch (Exception ex) when (ex is SQLiteException or IOException or UnauthorizedAccessException)
        {
            try
            {
                if (swapped && File.Exists(recoveryDatabasePath))
                    RestoreRecoveryCopy(currentPath, recoveryDatabasePath);
                else if (File.Exists(recoveryDatabasePath) && !File.Exists(currentPath))
                    File.Copy(recoveryDatabasePath, currentPath);
            }
            catch
            {
                // Preserve the original operation error; the recovery file remains available.
            }

            return new DatabaseReplaceResult(false, recoveryDatabasePath, "The database could not be replaced safely.");
        }
        finally
        {
            DeleteIfExists(temporaryPath);
        }
    }

    private static void CreateOnlineCopyFromPath(string sourcePath, string destinationPath, bool stripSensitiveData)
    {
        using var source = OpenConnection(sourcePath, readOnly: true);
        CreateOnlineCopy(source, destinationPath, stripSensitiveData);
    }

    private static void CreateOnlineCopy(SQLiteConnection source, string destinationPath, bool stripSensitiveData)
    {
        var destination = GetFullPath(destinationPath);
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(destination)!);
        DeleteIfExists(destination);

        using var destinationConnection = OpenConnection(destination, readOnly: false);
        source.BackupDatabase(destinationConnection, "main", "main", -1, null, 0);

        if (!stripSensitiveData)
            return;

        using var transaction = destinationConnection.BeginTransaction();
        using (var dropCookies = destinationConnection.CreateCommand())
        {
            dropCookies.Transaction = transaction;
            dropCookies.CommandText = "DROP TABLE IF EXISTS cookies";
            dropCookies.ExecuteNonQuery();
        }

        if (TableExists(destinationConnection, "configs"))
        {
            using var removeSavedCredentials = destinationConnection.CreateCommand();
            removeSavedCredentials.Transaction = transaction;
            removeSavedCredentials.CommandText = "DELETE FROM configs WHERE lower(key) = 'config:savedcredentials'";
            removeSavedCredentials.ExecuteNonQuery();
        }

        transaction.Commit();
    }

    private static SQLiteConnection OpenConnection(string path, bool readOnly)
    {
        var connection = new SQLiteConnection(
            $"Data Source=\"{path}\";Version=3;Read Only={readOnly};FailIfMissing={readOnly};PRAGMA busy_timeout=5000;");
        connection.Open();
        return connection;
    }

    private static bool TableExists(SQLiteConnection connection, string tableName)
    {
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = @name LIMIT 1";
        command.Parameters.AddWithValue("@name", tableName);
        return command.ExecuteScalar() != null;
    }

    private static int ReadSchemaVersion(SQLiteConnection connection)
    {
        if (!TableExists(connection, "configs"))
            return 0;

        using var command = connection.CreateCommand();
        command.CommandText = "SELECT value FROM configs WHERE lower(key) = @key LIMIT 1";
        command.Parameters.AddWithValue("@key", DatabaseVersionKey);
        var value = Convert.ToString(command.ExecuteScalar(), CultureInfo.InvariantCulture);
        return int.TryParse(value, NumberStyles.Integer, CultureInfo.InvariantCulture, out var version) && version >= 0
            ? version
            : 0;
    }

    private static string CreateTemporaryPath(string destinationPath)
    {
        var directory = System.IO.Path.GetDirectoryName(destinationPath)!;
        Directory.CreateDirectory(directory);
        return System.IO.Path.Combine(directory, $".{System.IO.Path.GetFileName(destinationPath)}.{Guid.NewGuid():N}.tmp");
    }

    private static string GetFullPath(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            throw new ArgumentException("A database path is required.", nameof(path));

        return System.IO.Path.GetFullPath(path);
    }

    private static bool PathsEqual(string left, string right) =>
        string.Equals(left, right, StringComparison.OrdinalIgnoreCase);

    private static void ReplaceFile(string sourcePath, string destinationPath)
    {
        Directory.CreateDirectory(System.IO.Path.GetDirectoryName(destinationPath)!);
        if (File.Exists(destinationPath))
        {
            File.Replace(sourcePath, destinationPath, null, ignoreMetadataErrors: true);
            return;
        }

        File.Move(sourcePath, destinationPath);
    }

    private static void RestoreRecoveryCopy(string currentPath, string recoveryPath)
    {
        var rollbackPath = CreateTemporaryPath(currentPath);
        try
        {
            File.Copy(recoveryPath, rollbackPath);
            ReplaceFile(rollbackPath, currentPath);
        }
        finally
        {
            DeleteIfExists(rollbackPath);
        }
    }

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
            File.Delete(path);
    }
}
