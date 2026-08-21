using System;
using System.Collections.Generic;
using System.IO;
using System.Text;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using VRCX.GoogleDrive;
using Xunit;

namespace BetterVRCX.Tests;

public sealed class GoogleDriveAuthServiceTests
{
    [Fact]
    public async Task ExchangeCode_uses_pkce_fields_without_a_client_secret()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = new StringContent("{\"access_token\":\"access\",\"refresh_token\":\"refresh\",\"expires_in\":3600,\"token_type\":\"Bearer\"}")
        });
        using var httpClient = new HttpClient(handler);
        var options = new GoogleDriveOAuthOptions("test-client.apps.googleusercontent.com");
        var service = new GoogleDriveAuthService(
            options,
            httpClient);

        var token = await service.ExchangeCodeAsync(
            "authorization-code",
            "code-verifier",
            new Uri("http://127.0.0.1:43123/oauth2callback/"));

        Assert.Equal("access", token.AccessToken);
        Assert.Equal("refresh", token.RefreshToken);
        Assert.Contains($"client_id={options.ClientId}", handler.RequestBody);
        Assert.Contains("code=authorization-code", handler.RequestBody);
        Assert.Contains("code_verifier=code-verifier", handler.RequestBody);
        Assert.Contains("redirect_uri=http%3A%2F%2F127.0.0.1%3A43123%2Foauth2callback%2F", handler.RequestBody);
        Assert.Contains("grant_type=authorization_code", handler.RequestBody);
        Assert.DoesNotContain("client_secret=", handler.RequestBody, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ExchangeCode_reports_google_error_details_without_echoing_the_response_body()
    {
        var handler = new RecordingHandler(_ => new HttpResponseMessage(HttpStatusCode.BadRequest)
        {
            Content = new StringContent(
                "{\"error\":\"invalid_grant\",\"error_description\":\"PKCE verifier rejected\",\"access_token\":\"do-not-display\"}")
        });
        using var httpClient = new HttpClient(handler);
        var service = new GoogleDriveAuthService(
            new GoogleDriveOAuthOptions("test-client.apps.googleusercontent.com"),
            httpClient);

        var exception = await Assert.ThrowsAsync<GoogleDriveOAuthException>(() => service.ExchangeCodeAsync(
            "authorization-code",
            "code-verifier",
            new Uri("http://127.0.0.1:43123/oauth2callback/")));

        Assert.Contains("invalid_grant", exception.Message, StringComparison.Ordinal);
        Assert.Contains("PKCE verifier rejected", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("do-not-display", exception.Message, StringComparison.Ordinal);
        Assert.DoesNotContain("access_token", exception.Message, StringComparison.Ordinal);
    }

    [Fact]
    public void CreateAuthorizationRequest_uses_drive_file_and_s256()
    {
        var service = new GoogleDriveAuthService(
            new GoogleDriveOAuthOptions("test-client.apps.googleusercontent.com"),
            new HttpClient());
        var request = service.CreateAuthorizationRequest(
            new Uri("http://127.0.0.1:43123/oauth2callback/"),
            "state-value",
            "code-verifier");

        Assert.Contains("response_type=code", request.AbsoluteUri);
        Assert.Contains("client_id=test-client.apps.googleusercontent.com", request.AbsoluteUri);
        Assert.Contains("code_challenge_method=S256", request.AbsoluteUri);
        Assert.Contains("scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fdrive.file", request.AbsoluteUri);
        Assert.Contains("access_type=offline", request.AbsoluteUri);
        Assert.DoesNotContain("client_secret", request.AbsoluteUri, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Unconfigured_client_id_is_rejected_before_authorization()
    {
        var service = new GoogleDriveAuthService(
            new GoogleDriveOAuthOptions(string.Empty),
            new HttpClient());

        var exception = Assert.Throws<GoogleDriveOAuthException>(() => service.CreateAuthorizationRequest(
            new Uri("http://127.0.0.1:43123/oauth2callback/"),
            "state-value",
            "code-verifier"));

        Assert.Contains("not configured", exception.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public void Default_reads_the_public_client_id_from_the_development_environment()
    {
        var previous = Environment.GetEnvironmentVariable(GoogleDriveOAuthOptions.ClientIdEnvironmentVariable);
        try
        {
            Environment.SetEnvironmentVariable(
                GoogleDriveOAuthOptions.ClientIdEnvironmentVariable,
                "test-client.apps.googleusercontent.com");

            Assert.Equal(
                "test-client.apps.googleusercontent.com",
                GoogleDriveOAuthOptions.Default.ClientId);
        }
        finally
        {
            Environment.SetEnvironmentVariable(
                GoogleDriveOAuthOptions.ClientIdEnvironmentVariable,
                previous);
        }
    }

    [Fact]
    public void DpapiRefreshTokenStore_does_not_write_the_refresh_token_as_plaintext()
    {
        var path = Path.Combine(Path.GetTempPath(), "BetterVRCX-tests", Guid.NewGuid().ToString("N"), "token.bin");
        var store = new DpapiGoogleRefreshTokenStore(path);
        try
        {
            store.Save("refresh-token-secret");

            Assert.Equal("refresh-token-secret", store.Load());
            Assert.DoesNotContain(
                "refresh-token-secret",
                Encoding.UTF8.GetString(File.ReadAllBytes(path)),
                StringComparison.Ordinal);
        }
        finally
        {
            store.Clear();
            var directory = Path.GetDirectoryName(path);
            if (directory != null && Directory.Exists(directory)) Directory.Delete(directory, recursive: true);
        }
    }

    private sealed class RecordingHandler(Func<HttpRequestMessage, HttpResponseMessage> responder) : HttpMessageHandler
    {
        public string RequestBody { get; private set; } = string.Empty;

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            RequestBody = request.Content == null ? string.Empty : await request.Content.ReadAsStringAsync(cancellationToken);
            return responder(request);
        }
    }
}
