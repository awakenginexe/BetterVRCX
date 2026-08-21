using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace VRCX.GoogleDrive;

public sealed record GoogleDriveOAuthOptions
{
    public GoogleDriveOAuthOptions(string clientId)
    {
        ClientId = clientId?.Trim() ?? string.Empty;
    }

    public string ClientId { get; }

    public const string DriveFileScope = "https://www.googleapis.com/auth/drive.file";
    public const string ClientIdEnvironmentVariable = "BETTERVRCX_GOOGLE_CLIENT_ID";
    public const string ClientIdFileName = "google-drive-client-id.txt";

    public static GoogleDriveOAuthOptions Default => new(LoadClientId());

    public bool IsConfigured => !string.IsNullOrWhiteSpace(ClientId);

    private static string LoadClientId()
    {
        var environmentValue = Environment.GetEnvironmentVariable(ClientIdEnvironmentVariable);
        if (!string.IsNullOrWhiteSpace(environmentValue))
            return environmentValue.Trim();

        try
        {
            var path = Path.Combine(AppContext.BaseDirectory, ClientIdFileName);
            return File.Exists(path) ? File.ReadAllText(path).Trim() : string.Empty;
        }
        catch (IOException)
        {
            return string.Empty;
        }
        catch (UnauthorizedAccessException)
        {
            return string.Empty;
        }
    }
}

public sealed record GoogleTokenSet(
    string AccessToken,
    string? RefreshToken,
    DateTimeOffset ExpiresAt,
    string TokenType = "Bearer");

public sealed record GoogleAuthorizationResponse(string? Code, string? State, string? Error);

public interface IGoogleSystemBrowser
{
    Task OpenAsync(Uri uri, CancellationToken cancellationToken);
}

public interface IGoogleLoopbackReceiverFactory
{
    IGoogleLoopbackReceiver Create();
}

public interface IGoogleLoopbackReceiver : IDisposable
{
    Uri RedirectUri { get; }
    Task<GoogleAuthorizationResponse> WaitAsync(CancellationToken cancellationToken);
}

public sealed class GoogleDriveOAuthException : Exception
{
    public GoogleDriveOAuthException(string message) : base(message)
    {
    }
}

public sealed class GoogleDriveAuthService
{
    private const string AuthorizationEndpoint = "https://accounts.google.com/o/oauth2/v2/auth";
    private const string TokenEndpoint = "https://oauth2.googleapis.com/token";

    private readonly GoogleDriveOAuthOptions _options;
    private readonly HttpClient _httpClient;
    private readonly IGoogleSystemBrowser _browser;
    private readonly IGoogleLoopbackReceiverFactory _receiverFactory;

    public GoogleDriveAuthService(
        GoogleDriveOAuthOptions options,
        HttpClient httpClient,
        IGoogleSystemBrowser? browser = null,
        IGoogleLoopbackReceiverFactory? receiverFactory = null)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
        _httpClient = httpClient ?? throw new ArgumentNullException(nameof(httpClient));
        _browser = browser ?? new SystemBrowser();
        _receiverFactory = receiverFactory ?? new LoopbackReceiverFactory();
    }

    public Uri CreateAuthorizationRequest(Uri redirectUri, string state, string codeVerifier)
    {
        ArgumentNullException.ThrowIfNull(redirectUri);
        EnsureConfigured();
        if (string.IsNullOrWhiteSpace(state) || string.IsNullOrWhiteSpace(codeVerifier))
            throw new ArgumentException("OAuth state and PKCE verifier are required.");

        var challenge = CreateCodeChallenge(codeVerifier);
        var query = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["redirect_uri"] = redirectUri.AbsoluteUri,
            ["response_type"] = "code",
            ["scope"] = GoogleDriveOAuthOptions.DriveFileScope,
            ["access_type"] = "offline",
            ["state"] = state,
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256"
        };
        return new Uri($"{AuthorizationEndpoint}?{EncodeForm(query)}");
    }

    public async Task<GoogleTokenSet> ConnectAsync(CancellationToken cancellationToken = default)
    {
        using var receiver = _receiverFactory.Create();
        var codeVerifier = CreateCodeVerifier();
        var state = CreateCodeVerifier();
        var authorizationUri = CreateAuthorizationRequest(receiver.RedirectUri, state, codeVerifier);

        await _browser.OpenAsync(authorizationUri, cancellationToken);
        var response = await receiver.WaitAsync(cancellationToken);
        if (!string.IsNullOrEmpty(response.Error))
            throw new GoogleDriveOAuthException("Google authorization was cancelled or denied.");
        if (!string.Equals(response.State, state, StringComparison.Ordinal))
            throw new GoogleDriveOAuthException("Google authorization failed state validation.");
        if (string.IsNullOrWhiteSpace(response.Code))
            throw new GoogleDriveOAuthException("Google authorization did not return an authorization code.");

        return await ExchangeCodeAsync(response.Code, codeVerifier, receiver.RedirectUri, cancellationToken);
    }

    public async Task<GoogleTokenSet> ExchangeCodeAsync(
        string authorizationCode,
        string codeVerifier,
        Uri redirectUri,
        CancellationToken cancellationToken = default)
    {
        EnsureConfigured();
        var form = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["code"] = authorizationCode,
            ["code_verifier"] = codeVerifier,
            ["redirect_uri"] = redirectUri.AbsoluteUri,
            ["grant_type"] = "authorization_code"
        };
        return await RequestTokenAsync(form, refreshTokenFallback: null, cancellationToken);
    }

    public async Task<GoogleTokenSet> RefreshAccessTokenAsync(
        string refreshToken,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new ArgumentException("A refresh token is required.", nameof(refreshToken));

        EnsureConfigured();
        var form = new Dictionary<string, string>
        {
            ["client_id"] = _options.ClientId,
            ["refresh_token"] = refreshToken,
            ["grant_type"] = "refresh_token"
        };
        return await RequestTokenAsync(form, refreshToken, cancellationToken);
    }

    private void EnsureConfigured()
    {
        if (!_options.IsConfigured)
            throw new GoogleDriveOAuthException(
                "Google Drive OAuth is not configured. Add the release client ID before connecting Google Drive.");
    }

    private async Task<GoogleTokenSet> RequestTokenAsync(
        Dictionary<string, string> form,
        string? refreshTokenFallback,
        CancellationToken cancellationToken)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, TokenEndpoint)
        {
            Content = new FormUrlEncodedContent(form)
        };
        using var response = await _httpClient.SendAsync(request, cancellationToken);
        if (!response.IsSuccessStatusCode)
        {
            var responseBody = await response.Content.ReadAsStringAsync(cancellationToken);
            throw CreateTokenExchangeException(response.StatusCode, responseBody);
        }

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);
        var root = document.RootElement;
        if (!root.TryGetProperty("access_token", out var accessTokenElement) ||
            accessTokenElement.ValueKind != JsonValueKind.String)
            throw new GoogleDriveOAuthException("Google did not return an access token.");

        var accessToken = accessTokenElement.GetString();
        var refreshToken = root.TryGetProperty("refresh_token", out var refreshTokenElement) &&
                           refreshTokenElement.ValueKind == JsonValueKind.String
            ? refreshTokenElement.GetString()
            : refreshTokenFallback;
        var expiresIn = root.TryGetProperty("expires_in", out var expiresElement) &&
                        expiresElement.TryGetInt64(out var expiresSeconds)
            ? expiresSeconds
            : 3600;
        var tokenType = root.TryGetProperty("token_type", out var tokenTypeElement) &&
                        tokenTypeElement.ValueKind == JsonValueKind.String
            ? tokenTypeElement.GetString() ?? "Bearer"
            : "Bearer";

        return new GoogleTokenSet(
            accessToken!,
            refreshToken,
            DateTimeOffset.UtcNow.AddSeconds(expiresIn),
            tokenType);
    }

    private static GoogleDriveOAuthException CreateTokenExchangeException(
        HttpStatusCode statusCode,
        string responseBody)
    {
        string? errorCode = null;
        string? errorDescription = null;
        try
        {
            using var document = JsonDocument.Parse(responseBody);
            var root = document.RootElement;
            errorCode = ReadSafeOAuthField(root, "error");
            errorDescription = ReadSafeOAuthField(root, "error_description");
        }
        catch (JsonException)
        {
            // Keep the response body out of the user-facing error if Google returns non-JSON.
        }

        var status = $" ({(int)statusCode})";
        if (string.IsNullOrWhiteSpace(errorCode))
            return new GoogleDriveOAuthException($"Google token exchange failed{status}.");

        var detail = string.IsNullOrWhiteSpace(errorDescription)
            ? errorCode
            : $"{errorCode}: {errorDescription}";
        return new GoogleDriveOAuthException($"Google token exchange failed{status}: {detail}");
    }

    private static string? ReadSafeOAuthField(JsonElement root, string property)
    {
        if (!root.TryGetProperty(property, out var value) || value.ValueKind != JsonValueKind.String)
            return null;

        var text = value.GetString()?.Trim();
        if (string.IsNullOrWhiteSpace(text))
            return null;

        text = text.Replace('\r', ' ').Replace('\n', ' ');
        return text.Length <= 256 ? text : text[..256];
    }

    private static string CreateCodeVerifier()
    {
        Span<byte> bytes = stackalloc byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Base64UrlEncode(bytes);
    }

    private static string CreateCodeChallenge(string codeVerifier)
    {
        var hash = SHA256.HashData(Encoding.ASCII.GetBytes(codeVerifier));
        return Base64UrlEncode(hash);
    }

    private static string Base64UrlEncode(ReadOnlySpan<byte> value) =>
        Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static string EncodeForm(IEnumerable<KeyValuePair<string, string>> values)
    {
        var form = new FormUrlEncodedContent(values);
        return form.ReadAsStringAsync().GetAwaiter().GetResult();
    }

    private sealed class SystemBrowser : IGoogleSystemBrowser
    {
        public Task OpenAsync(Uri uri, CancellationToken cancellationToken)
        {
            cancellationToken.ThrowIfCancellationRequested();
            Process.Start(new ProcessStartInfo
            {
                FileName = uri.AbsoluteUri,
                UseShellExecute = true
            });
            return Task.CompletedTask;
        }
    }

    private sealed class LoopbackReceiverFactory : IGoogleLoopbackReceiverFactory
    {
        public IGoogleLoopbackReceiver Create() => new LoopbackReceiver();
    }

    private sealed class LoopbackReceiver : IGoogleLoopbackReceiver
    {
        private readonly TcpListener _listener;

        public LoopbackReceiver()
        {
            _listener = new TcpListener(IPAddress.Loopback, 0);
            _listener.Start();
            var port = ((IPEndPoint)_listener.LocalEndpoint).Port;
            RedirectUri = new Uri($"http://127.0.0.1:{port}/oauth2callback/");
        }

        public Uri RedirectUri { get; }

        public async Task<GoogleAuthorizationResponse> WaitAsync(CancellationToken cancellationToken)
        {
            using var client = await _listener.AcceptTcpClientAsync(cancellationToken);
            await using var stream = client.GetStream();
            using var reader = new StreamReader(stream, Encoding.UTF8, leaveOpen: true);
            var requestLine = await reader.ReadLineAsync(cancellationToken) ?? string.Empty;
            var parts = requestLine.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            var target = parts.Length >= 2 ? parts[1] : "/";
            var callback = new Uri(new Uri(RedirectUri.GetLeftPart(UriPartial.Authority)), target);
            var query = ParseQuery(callback.Query);

            var responseBody = Encoding.UTF8.GetBytes("<html><body>You may close this window and return to BetterVRCX.</body></html>");
            var responseHeaders = Encoding.ASCII.GetBytes(
                $"HTTP/1.1 200 OK\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {responseBody.Length}\r\nConnection: close\r\n\r\n");
            await stream.WriteAsync(responseHeaders, cancellationToken);
            await stream.WriteAsync(responseBody, cancellationToken);

            query.TryGetValue("code", out var code);
            query.TryGetValue("state", out var state);
            query.TryGetValue("error", out var error);
            return new GoogleAuthorizationResponse(code, state, error);
        }

        public void Dispose()
        {
            _listener.Stop();
        }

        private static Dictionary<string, string> ParseQuery(string query)
        {
            var result = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var part in query.TrimStart('?').Split('&', StringSplitOptions.RemoveEmptyEntries))
            {
                var separator = part.IndexOf('=');
                var key = separator >= 0 ? part[..separator] : part;
                var value = separator >= 0 ? part[(separator + 1)..] : string.Empty;
                result[Uri.UnescapeDataString(key)] = Uri.UnescapeDataString(value.Replace('+', ' '));
            }

            return result;
        }
    }
}

public interface IGoogleRefreshTokenStore
{
    string? Load();
    void Save(string refreshToken);
    void Clear();
}

public sealed class DpapiGoogleRefreshTokenStore : IGoogleRefreshTokenStore
{
    private sealed record StoredToken(string RefreshToken);

    private readonly string _path;

    public DpapiGoogleRefreshTokenStore(string path)
    {
        _path = Path.GetFullPath(path);
    }

    public string? Load()
    {
        if (!File.Exists(_path))
            return null;

        try
        {
            var encrypted = File.ReadAllBytes(_path);
            var plain = ProtectedData.Unprotect(encrypted, null, DataProtectionScope.CurrentUser);
            var stored = JsonSerializer.Deserialize<StoredToken>(plain);
            return stored?.RefreshToken;
        }
        catch (CryptographicException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
        catch (IOException)
        {
            return null;
        }
        catch (UnauthorizedAccessException)
        {
            return null;
        }
    }

    public void Save(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            throw new ArgumentException("A refresh token is required.", nameof(refreshToken));

        var directory = Path.GetDirectoryName(_path);
        if (!string.IsNullOrEmpty(directory))
            Directory.CreateDirectory(directory);

        var plain = JsonSerializer.SerializeToUtf8Bytes(new StoredToken(refreshToken));
        var encrypted = ProtectedData.Protect(plain, null, DataProtectionScope.CurrentUser);
        var temporaryPath = $"{_path}.{Guid.NewGuid():N}.tmp";
        try
        {
            File.WriteAllBytes(temporaryPath, encrypted);
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

    public void Clear()
    {
        if (File.Exists(_path))
            File.Delete(_path);
    }
}
