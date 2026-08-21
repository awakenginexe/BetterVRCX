using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using VRCX.GoogleDrive;
using Xunit;

namespace BetterVRCX.Tests;

public sealed class GoogleDriveBackupProviderTests
{
    [Fact]
    public async Task ListBackups_reads_only_the_app_owned_backup_metadata()
    {
        var handler = new RecordingHandler(request =>
        {
            Assert.Equal("Bearer access", request.Headers.Authorization?.ToString());
            if (request.RequestUri!.Query.Contains("BetterVRCX", StringComparison.Ordinal))
            {
                return Json("{\"files\":[{\"id\":\"root\",\"name\":\"BetterVRCX\",\"mimeType\":\"application/vnd.google-apps.folder\"}]}");
            }

            return Json("{\"files\":[{\"id\":\"backup-1\",\"name\":\"Desktop-2026-08-19-232100.sqlite3\",\"size\":\"14200\",\"createdTime\":\"2026-08-19T16:21:00Z\",\"appProperties\":{\"bettervrcx_backup\":\"1\",\"device_name\":\"Desktop\",\"schema_version\":\"16\"}}]}");
        });
        using var httpClient = new HttpClient(handler);
        var auth = new GoogleDriveAuthService(new GoogleDriveOAuthOptions("client", "test-secret"), httpClient);
        var provider = new GoogleDriveBackupProvider(httpClient, auth, new FakeTokenStore("refresh"), new GoogleTokenSet("access", "refresh", DateTimeOffset.UtcNow.AddHours(1)));

        var backups = await provider.ListBackupsAsync();

        var backup = Assert.Single(backups);
        Assert.Equal("backup-1", backup.Id);
        Assert.Equal("Desktop", backup.DeviceName);
        Assert.Equal(16, backup.SchemaVersion);
        Assert.Equal(14200, backup.Size);
    }

    [Fact]
    public async Task Expired_access_token_is_refreshed_with_the_configured_client_secret()
    {
        var tokenRequestBody = string.Empty;
        var handler = new RecordingHandler(request =>
        {
            if (request.RequestUri!.AbsoluteUri == "https://oauth2.googleapis.com/token")
            {
                tokenRequestBody = request.Content!.ReadAsStringAsync().GetAwaiter().GetResult();
                return Json("{\"access_token\":\"refreshed-access\",\"expires_in\":3600,\"token_type\":\"Bearer\"}");
            }

            Assert.Equal("Bearer refreshed-access", request.Headers.Authorization?.ToString());
            return Json("{\"user\":{\"emailAddress\":\"user@example.com\"}}");
        });
        using var httpClient = new HttpClient(handler);
        var auth = new GoogleDriveAuthService(new GoogleDriveOAuthOptions("client", "test-secret"), httpClient);
        var provider = new GoogleDriveBackupProvider(
            httpClient,
            auth,
            new FakeTokenStore("refresh-token"),
            new GoogleTokenSet("expired-access", "refresh-token", DateTimeOffset.UtcNow.AddSeconds(-1)));

        var email = await provider.GetAccountEmailAsync();

        Assert.Equal("user@example.com", email);
        Assert.Contains("grant_type=refresh_token", tokenRequestBody);
        Assert.Contains("client_secret=test-secret", tokenRequestBody, StringComparison.OrdinalIgnoreCase);
    }

    private static HttpResponseMessage Json(string content) => new(HttpStatusCode.OK)
    {
        Content = new StringContent(content)
    };

    private sealed class FakeTokenStore(string refreshToken) : IGoogleRefreshTokenStore
    {
        public string? Load() => refreshToken;
        public void Save(string value) { }
        public void Clear() { }
    }

    private sealed class RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            return Task.FromResult(responder(request));
        }
    }
}
