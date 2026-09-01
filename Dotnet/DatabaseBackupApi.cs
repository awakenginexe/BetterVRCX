using System;
using System.IO;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using VRCX.DatabaseBackup;
using VRCX.GoogleDrive;

namespace VRCX;

public sealed record CloudBackupStatus(
    string State,
    bool Connected,
    string? Email,
    DateTimeOffset? LastBackupAt,
    string? LastBackupName,
    long LastBackupSize,
    string? Error);

public sealed record CloudBackupOperationResult(
    bool Success,
    string State,
    string? Error,
    bool RestartRequired,
    string? RecoveryPath);

public sealed class DatabaseBackupApi
{
    private const int SupportedSchemaVersion = 16;
    private readonly SemaphoreSlim _operationLock = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private readonly GoogleDriveBackupStateStore _stateStore;
    private readonly DpapiGoogleRefreshTokenStore _tokenStore;
    private readonly GoogleDriveBackupProvider _provider;
    private CloudBackupStatus _status;

    public DatabaseBackupApi()
    {
        var appDataDirectory = GetAppDataDirectory();
        _tokenStore = new DpapiGoogleRefreshTokenStore(Path.Combine(appDataDirectory, "google-drive-refresh-token.bin"));
        _stateStore = new GoogleDriveBackupStateStore(Path.Combine(appDataDirectory, "google-drive-backup.json"));
        var httpClient = new HttpClient
        {
            Timeout = TimeSpan.FromMinutes(5)
        };
        httpClient.DefaultRequestHeaders.UserAgent.ParseAdd("BetterVRCX-CloudBackup");
        var authService = new GoogleDriveAuthService(GoogleDriveOAuthOptions.Default, httpClient);
        _provider = new GoogleDriveBackupProvider(httpClient, authService, _tokenStore);
        var lastBackup = _stateStore.Load();
        _status = new CloudBackupStatus(
            _provider.IsConnected ? "connected" : "not_connected",
            _provider.IsConnected,
            null,
            lastBackup?.CreatedAt,
            lastBackup?.Name,
            lastBackup?.Size ?? 0,
            null);
    }

    public string GetStatus()
    {
        var connected = _provider.IsConnected;
        if (!connected && !_status.State.EndsWith("ing", StringComparison.Ordinal))
            _status = _status with { State = "not_connected", Connected = false, Email = null };
        else if (connected && _status.State == "not_connected")
            _status = _status with { State = "connected", Connected = true };
        return Serialize(_status);
    }

    public async Task<string> ConnectGoogleDrive()
    {
        if (!await _operationLock.WaitAsync(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");

        SetStatus("connecting", connected: false, error: null);
        try
        {
            var connection = await _provider.ConnectAsync();
            SetStatus("connected", connected: true, email: connection.Email, error: null);
            return Serialize(_status);
        }
        catch (Exception ex)
        {
            var state = ex is GoogleDriveOAuthException ? "auth_expired" : "error";
            SetStatus(state, connected: false, error: GetSafeError(ex));
            return Serialize(_status);
        }
        finally
        {
            _operationLock.Release();
        }
    }

    public string DisconnectGoogleDrive()
    {
        if (!_operationLock.Wait(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");

        try
        {
            _provider.Disconnect();
            SetStatus("not_connected", connected: false, email: null, error: null);
            return Serialize(_status);
        }
        finally
        {
            _operationLock.Release();
        }
    }

    public async Task<string> BackupNow()
    {
        if (!await _operationLock.WaitAsync(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");
        if (!_provider.IsConnected)
        {
            _operationLock.Release();
            return SerializeFailure("not_connected", "Connect Google Drive before creating a backup.");
        }

        string? workingDirectory = null;
        try
        {
            workingDirectory = CreateWorkingDirectory();
            var snapshotPath = Path.Combine(workingDirectory, "VRCX.sqlite3");
            SetStatus("backing_up", connected: true, error: null);
            var metadata = SQLite.Instance.WithWriteLock(connection =>
            {
                var schemaVersion = DatabaseBackupService.GetSchemaVersion(connection);
                var backupMetadata = new DatabaseBackupMetadata(
                    DateTimeOffset.UtcNow,
                    Program.Version ?? "unknown",
                    Environment.MachineName,
                    schemaVersion);
                var snapshot = DatabaseBackupService.CreateSnapshot(connection, snapshotPath, backupMetadata);
                return (snapshot, backupMetadata);
            });

            var driveMetadata = new GoogleDriveBackupMetadata(
                metadata.backupMetadata.CreatedAt,
                metadata.backupMetadata.ApplicationVersion,
                metadata.backupMetadata.DeviceName,
                metadata.backupMetadata.SchemaVersion,
                metadata.snapshot.Size);
            var uploaded = await _provider.UploadAsync(snapshotPath, driveMetadata);
            var backupState = new GoogleDriveBackupState(
                metadata.backupMetadata.CreatedAt,
                uploaded.Name,
                uploaded.Size,
                metadata.backupMetadata.DeviceName);
            _stateStore.Save(backupState);
            _status = ApplyLastBackupStatus(_status, backupState);
            SetStatus("backup_complete", connected: true, email: _status.Email, error: null);
            return Serialize(_status);
        }
        catch (Exception ex)
        {
            var state = ex is GoogleDriveOAuthException ? "auth_expired" : "upload_failed";
            SetStatus(state, connected: _provider.IsConnected, error: GetSafeError(ex));
            return Serialize(_status);
        }
        finally
        {
            if (workingDirectory != null)
                TryDeleteDirectory(workingDirectory);
            _operationLock.Release();
        }
    }

    public async Task<string> ListBackups()
    {
        if (!await _operationLock.WaitAsync(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");
        try
        {
            if (!_provider.IsConnected)
                return SerializeFailure("not_connected", "Connect Google Drive before viewing backups.");
            var backups = await _provider.ListBackupsAsync();
            return JsonSerializer.Serialize(backups, _jsonOptions);
        }
        catch (Exception ex)
        {
            SetStatus(ex is GoogleDriveOAuthException ? "auth_expired" : "download_failed", _provider.IsConnected, _status.Email, GetSafeError(ex));
            return SerializeFailure(_status.State, _status.Error);
        }
        finally
        {
            _operationLock.Release();
        }
    }

    public async Task<string> RestoreBackup(string fileId, string mode)
    {
        if (!await _operationLock.WaitAsync(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");
        if (!_provider.IsConnected)
        {
            _operationLock.Release();
            return SerializeFailure("not_connected", "Connect Google Drive before restoring a backup.");
        }

        if (!string.Equals(mode, "merge", StringComparison.OrdinalIgnoreCase) &&
            !string.Equals(mode, "replace", StringComparison.OrdinalIgnoreCase))
        {
            _operationLock.Release();
            return SerializeFailure("error", "Choose either merge or replace for the restore.");
        }

        string? workingDirectory = null;
        try
        {
            workingDirectory = CreateWorkingDirectory();
            var downloadedPath = Path.Combine(workingDirectory, "download.sqlite3");
            SetStatus("downloading", connected: true, error: null);
            await _provider.DownloadAsync(fileId, downloadedPath);
            var validation = DatabaseBackupService.Validate(downloadedPath, SupportedSchemaVersion);
            if (!validation.IsValid || !validation.IsCompatible)
            {
                SetStatus("error", connected: true, error: validation.Error);
                return Serialize(new CloudBackupOperationResult(false, "error", validation.Error, false, null));
            }

            DatabaseMergeResult? mergeResult = null;
            DatabaseReplaceResult? replaceResult = null;
            if (string.Equals(mode, "merge", StringComparison.OrdinalIgnoreCase))
            {
                SetStatus("merging", connected: true, error: null);
                var currentPath = SQLite.Instance.GetDatabaseLocation();
                mergeResult = SQLite.Instance.WithWriteLock(connection =>
                    DatabaseMergeService.Merge(connection, currentPath, downloadedPath, SupportedSchemaVersion));
                if (!mergeResult.Success)
                {
                    SetStatus("error", connected: true, error: mergeResult.Error);
                    return Serialize(new CloudBackupOperationResult(false, "error", mergeResult.Error, false, null));
                }
            }
            else
            {
                SetStatus("restoring", connected: true, error: null);
                var recoveryPath = CreateRecoveryPath(SQLite.Instance.GetDatabaseLocation());
                replaceResult = SQLite.Instance.WithDatabaseClosed(currentPath =>
                    DatabaseBackupService.Replace(currentPath, downloadedPath, recoveryPath, SupportedSchemaVersion));
                if (!replaceResult.Success)
                {
                    SetStatus("error", connected: true, error: replaceResult.Error);
                    return Serialize(new CloudBackupOperationResult(false, "error", replaceResult.Error, false, replaceResult.RecoveryPath));
                }
            }

            SetStatus("restore_complete", connected: true, error: null);
            return Serialize(new CloudBackupOperationResult(
                true,
                _status.State,
                null,
                RestartRequired: true,
                replaceResult?.RecoveryPath));
        }
        catch (Exception ex)
        {
            var state = ex is GoogleDriveOAuthException ? "auth_expired" : "download_failed";
            SetStatus(state, connected: _provider.IsConnected, error: GetSafeError(ex));
            return Serialize(new CloudBackupOperationResult(false, state, _status.Error, false, null));
        }
        finally
        {
            if (workingDirectory != null)
                TryDeleteDirectory(workingDirectory);
            _operationLock.Release();
        }
    }

    public async Task<string> DeleteBackup(string fileId)
    {
        if (!await _operationLock.WaitAsync(0))
            return SerializeFailure("busy", "Another Google Drive operation is already running.");
        if (!_provider.IsConnected)
        {
            _operationLock.Release();
            return SerializeFailure("not_connected", "Connect Google Drive before deleting a backup.");
        }

        try
        {
            SetStatus("deleting", connected: true, error: null);
            await _provider.TrashBackupAsync(fileId);
            SetStatus("backup_deleted", connected: true, error: null);
            return Serialize(new CloudBackupOperationResult(true, "backup_deleted", null, false, null));
        }
        catch (Exception ex)
        {
            var state = ex is GoogleDriveOAuthException ? "auth_expired" : "error";
            SetStatus(state, connected: _provider.IsConnected, error: GetSafeError(ex));
            return Serialize(new CloudBackupOperationResult(false, state, _status.Error, false, null));
        }
        finally
        {
            _operationLock.Release();
        }
    }

    private void SetStatus(string state, bool connected, string? email = null, string? error = null)
    {
        _status = _status with
        {
            State = state,
            Connected = connected,
            Email = connected ? email ?? _status.Email : null,
            Error = error
        };
    }

    internal static CloudBackupStatus ApplyLastBackupStatus(
        CloudBackupStatus status,
        GoogleDriveBackupState backup)
    {
        return status with
        {
            LastBackupAt = backup.CreatedAt,
            LastBackupName = backup.Name,
            LastBackupSize = backup.Size
        };
    }

    private string Serialize<T>(T value) => JsonSerializer.Serialize(value, _jsonOptions);

    private string SerializeFailure(string state, string? error) =>
        Serialize(new CloudBackupOperationResult(false, state, error, false, null));

    private static string GetAppDataDirectory()
    {
        if (!string.IsNullOrWhiteSpace(Program.AppDataDirectory))
            return Program.AppDataDirectory;
        var configDirectory = !string.IsNullOrWhiteSpace(Program.ConfigLocation)
            ? Path.GetDirectoryName(Program.ConfigLocation)
            : null;
        return configDirectory ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "VRCX");
    }

    private static string CreateWorkingDirectory()
    {
        var directory = Path.Combine(Path.GetTempPath(), "BetterVRCX", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(directory);
        return directory;
    }

    private static string CreateRecoveryPath(string databasePath)
    {
        var directory = Path.GetDirectoryName(databasePath) ?? Path.GetTempPath();
        var timestamp = DateTime.Now.ToString("yyyy-MM-dd-HHmmss");
        var path = Path.Combine(directory, $"VRCX-before-cloud-restore-{timestamp}.sqlite3");
        var counter = 0;
        while (File.Exists(path))
        {
            counter++;
            path = Path.Combine(directory, $"VRCX-before-cloud-restore-{timestamp}-{counter}.sqlite3");
        }

        return path;
    }

    private static void TryDeleteDirectory(string directory)
    {
        try
        {
            if (Directory.Exists(directory))
                Directory.Delete(directory, recursive: true);
        }
        catch
        {
        }
    }

    private static string GetSafeError(Exception exception)
    {
        return exception switch
        {
            GoogleDriveOAuthException => exception.Message,
            GoogleDriveApiException => exception.Message,
            FileNotFoundException => "The database snapshot file was not found.",
            IOException => "The database file could not be read or written.",
            _ => "The database backup operation failed."
        };
    }
}

public sealed record GoogleDriveBackupState(
    DateTimeOffset CreatedAt,
    string Name,
    long Size,
    string DeviceName);

internal sealed class GoogleDriveBackupStateStore
{
    private readonly string _path;
    private readonly JsonSerializerOptions _jsonOptions = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public GoogleDriveBackupStateStore(string path)
    {
        _path = Path.GetFullPath(path);
    }

    public GoogleDriveBackupState? Load()
    {
        try
        {
            if (!File.Exists(_path))
                return null;
            return JsonSerializer.Deserialize<GoogleDriveBackupState>(File.ReadAllText(_path), _jsonOptions);
        }
        catch (Exception ex) when (ex is IOException or UnauthorizedAccessException or JsonException)
        {
            return null;
        }
    }

    public void Save(GoogleDriveBackupState state)
    {
        var directory = Path.GetDirectoryName(_path);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);
        var temporaryPath = $"{_path}.{Guid.NewGuid():N}.tmp";
        try
        {
            File.WriteAllText(temporaryPath, JsonSerializer.Serialize(state, _jsonOptions));
            if (File.Exists(_path))
                File.Replace(temporaryPath, _path, null, ignoreMetadataErrors: true);
            else
                File.Move(temporaryPath, _path);
        }
        finally
        {
            if (File.Exists(temporaryPath))
                File.Delete(temporaryPath);
        }
    }
}
