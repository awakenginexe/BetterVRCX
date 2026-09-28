using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using VRCX;
using Xunit;

public class WebApiRetryAfterTests
{
    [Fact]
    public async Task ExecuteExposesRetryAfterWithoutChangingStatusOrBody()
    {
        var api = new WebApi();
        var client = new HttpClient(new RetryAfterHandler());
        typeof(WebApi).GetField("_httpClient", BindingFlags.Instance | BindingFlags.NonPublic)!
            .SetValue(api, client);

        var result = await api.Execute(new Dictionary<string, object>
        {
            ["url"] = "https://example.com/invite/usr_a",
            ["method"] = "POST",
            ["body"] = "{}"
        });

        Assert.Equal(429, result.Item1);
        Assert.Equal("{\"error\":\"slow down\"}", result.Item2);
        Assert.Equal("120", result.Item3);

        var json = await api.ExecuteJson("{\"url\":\"https://example.com/invite/usr_a\",\"method\":\"POST\",\"body\":\"{}\"}");
        Assert.Contains("\"retryAfter\":\"120\"", json);
    }

    private sealed class RetryAfterHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var response = new HttpResponseMessage((HttpStatusCode)429)
            {
                Content = new StringContent("{\"error\":\"slow down\"}")
            };
            response.Headers.RetryAfter = new RetryConditionHeaderValue(TimeSpan.FromSeconds(120));
            return Task.FromResult(response);
        }
    }
}
