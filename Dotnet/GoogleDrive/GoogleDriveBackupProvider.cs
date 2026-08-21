using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace VRCX.GoogleDrive;

public sealed record GoogleDriveBackupMetadata(
    DateTimeOffset CreatedAt,
    string ApplicationVersion,
    string DeviceName,
    int SchemaVersion,
    long Size);

public sealed record GoogleDriveBackupFile(
    string Id,
    string Name,
    long Size,
    DateTimeOffset? CreatedAt,
    string DeviceName,
    int SchemaVersion);

public sealed class GoogleDriveApiException : Exception
{
    public GoogleDriveApiException(string message, HttpStatusCode statusCode) : base(message)
    {
        StatusCode = statusCode;
    }

    public HttpStatusCode StatusCode { get; }
}

public sealed class GoogleDriveBackupProvider
{
    private const string DriveApiBase = "https://www.googleapis.com/drive/v3";
    private const string UploadApiBase = "https://www.googleapis.com/upload/drive/v3";
    private const string FolderMimeType = "application/vnd.google-apps.folder";
    private const string RootFolderName = "BetterVRCX";
    private const string BackupFolderName = "Backups";

    private readonly HttpClient _httpClient;
    private readonly GoogleDriveAuthService _authService;
    private readonly IGoogleRefreshTokenStore _tokenStore;
    private readonly SemaphoreSlim _tokenLock = new(1, 1);
    private GoogleTokenSet? _token;

    public GoogleDriveBackupProvider(
        HttpClient httpClient,
        GoogleDriveAuthService authService,
        IGoogleRefreshTokenStore tokenStore,
        GoogleTokenSet? initialToken = null)
    {
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _authService = authService ?? throw new ArgumentNullException(nameof(authService));
        _tokenStore = tokenStore ?? throw new ArgumentNullException(nameof(tokenStore));
        _token = initialToken;
    }

    public bool IsConnected => !string.IsNullOrWhiteSpace(_tokenStore.Load()) || _token != null;

    public async Task<GoogleDriveConnectionResult> ConnectAsync(CancellationToken cancellationToken = default)
    {
        var token = await _authService.ConnectAsync(cancellationToken);
        if (string.IsNullOrWhiteSpace(token.RefreshToken))
            throw new GoogleDriveOAuthException("Google did not return a refresh token.");

        _tokenStore.Save(token.RefreshToken);
        _token = token;
        var email = await GetAccountEmailAsync(cancellationToken);
        return new GoogleDriveConnectionResult(true, email, token.ExpiresAt);
    }

    public void Disconnect()
    {
        _token = null;
        _tokenStore.Clear();
    }

    public async Task<IReadOnlyList<GoogleDriveBackupFile>> ListBackupsAsync(CancellationToken cancellationToken = default)
    {
        var backupFolderId = await EnsureBackupFolderAsync(cancellationToken);
        var query = $"'{EscapeQueryValue(backupFolderId)}' in parents and trashed = false and appProperties has {{ key='bettervrcx_backup' and value='1' }}";
        var uri = BuildDriveUri("files", new Dictionary<string, string>
        {
            ["q"] = query,
            ["pageSize"] = "100",
            ["orderBy"] = "createdTime desc",
            ["fields"] = "files(id,name,size,createdTime,appProperties)"
        });

        using var response = await SendAuthorizedAsync(token => new HttpRequestMessage(HttpMethod.Get, uri), cancellationToken);
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var result = new List<GoogleDriveBackupFile>();
        if (!document.RootElement.TryGetProperty("files", out var files) || files.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var file in files.EnumerateArray())
        {
            var appProperties = file.TryGetProperty("appProperties", out var properties) && properties.ValueKind == JsonValueKind.Object
                ? properties
                : default;
            result.Add(new GoogleDriveBackupFile(
                ReadString(file, "id"),
                ReadString(file, "name"),
                ReadInt64(file, "size"),
                ReadDateTimeOffset(file, "createdTime"),
                ReadProperty(appProperties, "device_name"),
                ReadPropertyInt(appProperties, "schema_version")));
        }

        return result;
    }

    public async Task<GoogleDriveBackupFile> UploadAsync(
        string snapshotPath,
        GoogleDriveBackupMetadata metadata,
        CancellationToken cancellationToken = default)
    {
        var fileInfo = new FileInfo(snapshotPath);
        if (!fileInfo.Exists)
            throw new FileNotFoundException("The database snapshot does not exist.", snapshotPath);

        var backupFolderId = await EnsureBackupFolderAsync(cancellationToken);
        var safeDeviceName = SanitizeFileNamePart(metadata.DeviceName);
        var fileName = $"{safeDeviceName}-{metadata.CreatedAt.ToLocalTime():yyyy-MM-dd-HHmmss}.sqlite3";
        var appProperties = new Dictionary<string, string>
        {
            ["bettervrcx_backup"] = "1",
            ["backup_version"] = "1",
            ["application_version"] = metadata.ApplicationVersion,
            ["device_name"] = metadata.DeviceName,
            ["schema_version"] = metadata.SchemaVersion.ToString(),
            ["created_at"] = metadata.CreatedAt.ToUniversalTime().ToString("O"),
            ["size_bytes"] = fileInfo.Length.ToString()
        };
        var fileMetadata = new Dictionary<string, object>
        {
            ["name"] = fileName,
            ["parents"] = new[] { backupFolderId },
            ["appProperties"] = appProperties
        };
        var uploadUri = BuildUploadUri("files", new Dictionary<string, string>
        {
            ["uploadType"] = "multipart",
            ["fields"] = "id,name,size,createdTime,appProperties"
        });

        using var response = await SendAuthorizedAsync(token =>
        {
            var boundary = "bettervrcx-" + Guid.NewGuid().ToString("N");
            var multipart = new MultipartContent("related", boundary);
            multipart.Add(new StringContent(JsonSerializer.Serialize(fileMetadata), Encoding.UTF8, "application/json"));
            var fileContent = new StreamContent(File.OpenRead(fileInfo.FullName));
            fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            multipart.Add(fileContent);
            return new HttpRequestMessage(HttpMethod.Post, uploadUri) { Content = multipart };
        }, cancellationToken);

        return await ParseBackupFileAsync(response, cancellationToken);
    }

    public async Task<string> DownloadAsync(
        string fileId,
        string destinationPath,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(fileId))
            throw new ArgumentException("A backup file id is required.", nameof(fileId));

        var uri = BuildDriveUri($"files/{Uri.EscapeDataString(fileId)}", new Dictionary<string, string>
        {
            ["alt"] = "media"
        });
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(destinationPath))!);
        using var response = await SendAuthorizedAsync(token => new HttpRequestMessage(HttpMethod.Get, uri), cancellationToken);
        await using var output = new FileStream(destinationPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await response.Content.CopyToAsync(output, cancellationToken);
        return Path.GetFullPath(destinationPath);
    }

    public async Task<string?> GetAccountEmailAsync(CancellationToken cancellationToken = default)
    {
        var uri = BuildDriveUri("about", new Dictionary<string, string>
        {
            ["fields"] = "user(emailAddress)"
        });
        try
        {
            using var response = await SendAuthorizedAsync(token => new HttpRequestMessage(HttpMethod.Get, uri), cancellationToken);
            using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
            return document.RootElement.TryGetProperty("user", out var user) && user.TryGetProperty("emailAddress", out var email)
                ? email.GetString()
                : null;
        }
        catch (GoogleDriveApiException)
        {
            // drive.file is intentionally the only requested scope. Some
            // Drive configurations do not expose account metadata under that
            // least-privilege scope, so connection remains usable without it.
            return null;
        }
    }

    private async Task<string> EnsureBackupFolderAsync(CancellationToken cancellationToken)
    {
        var rootId = await FindFolderAsync(RootFolderName, parentId: null, cancellationToken) ??
                     await CreateFolderAsync(RootFolderName, parentId: null, cancellationToken);
        return await FindFolderAsync(BackupFolderName, rootId, cancellationToken) ??
               await CreateFolderAsync(BackupFolderName, rootId, cancellationToken);
    }

    private async Task<string?> FindFolderAsync(string name, string? parentId, CancellationToken cancellationToken)
    {
        var parentClause = parentId == null ? string.Empty : $" and '{EscapeQueryValue(parentId)}' in parents";
        var query = $"mimeType = '{FolderMimeType}' and name = '{EscapeQueryValue(name)}' and trashed = false{parentClause}";
        var uri = BuildDriveUri("files", new Dictionary<string, string>
        {
            ["q"] = query,
            ["pageSize"] = "10",
            ["fields"] = "files(id,name,mimeType)"
        });
        using var response = await SendAuthorizedAsync(token => new HttpRequestMessage(HttpMethod.Get, uri), cancellationToken);
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        if (!document.RootElement.TryGetProperty("files", out var files) || files.GetArrayLength() == 0)
            return null;

        return files[0].GetProperty("id").GetString();
    }

    private async Task<string> CreateFolderAsync(string name, string? parentId, CancellationToken cancellationToken)
    {
        var metadata = new Dictionary<string, object>
        {
            ["name"] = name,
            ["mimeType"] = FolderMimeType
        };
        if (parentId != null)
            metadata["parents"] = new[] { parentId };

        var uri = BuildDriveUri("files", new Dictionary<string, string> { ["fields"] = "id" });
        using var response = await SendAuthorizedAsync(token => new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = new StringContent(JsonSerializer.Serialize(metadata), Encoding.UTF8, "application/json")
        }, cancellationToken);
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        return document.RootElement.GetProperty("id").GetString() ?? throw new GoogleDriveApiException("Google Drive did not return a folder id.", response.StatusCode);
    }

    private async Task<GoogleDriveBackupFile> ParseBackupFileAsync(HttpResponseMessage response, CancellationToken cancellationToken)
    {
        using var document = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        var file = document.RootElement;
        var properties = file.GetProperty("appProperties");
        return new GoogleDriveBackupFile(
            ReadString(file, "id"),
            ReadString(file, "name"),
            ReadInt64(file, "size"),
            ReadDateTimeOffset(file, "createdTime"),
            ReadProperty(properties, "device_name"),
            ReadPropertyInt(properties, "schema_version"));
    }

    private async Task<HttpResponseMessage> SendAuthorizedAsync(
        Func<string, HttpRequestMessage> requestFactory,
        CancellationToken cancellationToken)
    {
        var token = await GetAccessTokenAsync(cancellationToken);
        using var request = requestFactory(token.AccessToken);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        var response = await _httpClient.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        if (response.StatusCode != HttpStatusCode.Unauthorized)
        {
            EnsureSuccess(response);
            return response;
        }

        response.Dispose();
        token = await RefreshTokenAsync(cancellationToken);
        using var retryRequest = requestFactory(token.AccessToken);
        retryRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.AccessToken);
        var retryResponse = await _httpClient.SendAsync(retryRequest, HttpCompletionOption.ResponseHeadersRead, cancellationToken);
        EnsureSuccess(retryResponse);
        return retryResponse;
    }

    private async Task<GoogleTokenSet> GetAccessTokenAsync(CancellationToken cancellationToken)
    {
        await _tokenLock.WaitAsync(cancellationToken);
        try
        {
            if (_token != null && _token.ExpiresAt > DateTimeOffset.UtcNow.AddMinutes(1))
                return _token;
            return await RefreshTokenAsync(cancellationToken);
        }
        finally
        {
            _tokenLock.Release();
        }
    }

    private async Task<GoogleTokenSet> RefreshTokenAsync(CancellationToken cancellationToken)
    {
        var refreshToken = _tokenStore.Load();
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new GoogleDriveOAuthException("Google Drive is not connected.");

        var token = await _authService.RefreshAccessTokenAsync(refreshToken, cancellationToken);
        if (!string.IsNullOrWhiteSpace(token.RefreshToken) && token.RefreshToken != refreshToken)
            _tokenStore.Save(token.RefreshToken);
        _token = token;
        return token;
    }

    private static void EnsureSuccess(HttpResponseMessage response)
    {
        if (!response.IsSuccessStatusCode)
            throw new GoogleDriveApiException("Google Drive request failed.", response.StatusCode);
    }

    private static string BuildDriveUri(string resource, Dictionary<string, string> query) =>
        $"{DriveApiBase}/{resource}?{EncodeQuery(query)}";

    private static string BuildUploadUri(string resource, Dictionary<string, string> query) =>
        $"{UploadApiBase}/{resource}?{EncodeQuery(query)}";

    private static string EncodeQuery(Dictionary<string, string> query)
    {
        using var content = new FormUrlEncodedContent(query);
        return content.ReadAsStringAsync().GetAwaiter().GetResult();
    }

    private static string EscapeQueryValue(string value) => value.Replace("'", "\\'", StringComparison.Ordinal);

    private static string SanitizeFileNamePart(string value)
    {
        var invalid = Path.GetInvalidFileNameChars();
        var builder = new StringBuilder(string.IsNullOrWhiteSpace(value) ? "Device" : value);
        for (var i = 0; i < builder.Length; i++)
        {
            if (Array.IndexOf(invalid, builder[i]) >= 0)
                builder[i] = '_';
        }

        return builder.ToString();
    }

    private static string ReadString(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString() ?? string.Empty
            : string.Empty;

    private static long ReadInt64(JsonElement element, string property)
    {
        if (!element.TryGetProperty(property, out var value))
            return 0;
        if (value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out var number))
            return number;
        return value.ValueKind == JsonValueKind.String && long.TryParse(value.GetString(), out var result)
            ? result
            : 0;
    }

    private static DateTimeOffset? ReadDateTimeOffset(JsonElement element, string property) =>
        element.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String && DateTimeOffset.TryParse(value.GetString(), out var result)
            ? result
            : null;

    private static string ReadProperty(JsonElement properties, string property) =>
        properties.ValueKind == JsonValueKind.Object && properties.TryGetProperty(property, out var value)
            ? value.GetString() ?? string.Empty
            : string.Empty;

    private static int ReadPropertyInt(JsonElement properties, string property) =>
        int.TryParse(ReadProperty(properties, property), out var result) ? result : 0;
}

public sealed record GoogleDriveConnectionResult(bool Connected, string? Email, DateTimeOffset TokenExpiresAt);
