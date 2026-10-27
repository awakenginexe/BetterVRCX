using System;
using System.IO;
using VRCX;
using Xunit;

public class FoundAvatarLogReaderTests
{
    private const string Account = "usr_11111111-1111-1111-1111-111111111111";
    private const string Other = "usr_22222222-2222-2222-2222-222222222222";
    private const string Avatar = "avtr_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    private static string Line(string message, string time = "2026.10.27 10:00:00") => $"{time} Debug      -  {message}";
    private static string Login(string account) => Line($"User Authenticated: Someone ({account})");

    [Fact]
    public void RequiresAuthenticatedAccountAndNeverInfersWearer()
    {
        var parser = new FoundAvatarLogReader();
        Assert.Null(parser.ReadLine(Line($"Loading Avatar Data:{Avatar}")));
        parser.ReadLine(Login(Account));
        Assert.Null(parser.ReadLine(Line("[Behaviour] Switching Someone to avatar Cool Avatar")));
        var observation = parser.ReadLine(Line($"Loading Avatar Data:{Avatar.ToUpperInvariant()}"));
        // Prefix casing is fixed by VRChat; UUID casing is canonicalized.
        Assert.Null(observation);
        observation = parser.ReadLine(Line($"Saving Avatar Data:avtr_AAAAAAAA-AAAA-AAAA-AAAA-AAAAAAAAAAAA"));
        Assert.NotNull(observation);
        Assert.Equal(Avatar, observation.AvatarId);
        Assert.Equal(Account, observation.ObserverId);
        Assert.Equal(new DateTime(2026, 10, 27, 10, 0, 0, DateTimeKind.Local).ToUniversalTime(), observation.ObservedAt);
        parser.ReadLine(Login(Other));
        Assert.Equal(Other, parser.ReadLine(Line($"Loading Avatar Data:{Avatar}"))!.ObserverId);
    }

    [Theory]
    [InlineData("Loading Avatar Data:avtr_bad")]
    [InlineData("Loading Avatar Data:avtr_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa-extra")]
    [InlineData("[Behaviour] Avatar avtr_aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")]
    public void RejectsNamesMalformedIdsAndUnrelatedLines(string message)
    {
        var parser = new FoundAvatarLogReader();
        parser.ReadLine(Login(Account));
        Assert.Null(parser.ReadLine(Line(message)));
        Assert.Null(parser.ReadLine(message));
    }

    [Fact]
    public void LogoutAndMalformedAuthenticationClearAccountAttribution()
    {
        var parser = new FoundAvatarLogReader();
        parser.ReadLine(Login(Account));
        parser.ReadLine(Line("User Authenticated: malformed"));
        Assert.Null(parser.ReadLine(Line($"Loading Avatar Data:{Avatar}")));
        parser.ReadLine(Login(Account));
        parser.ReadLine(Line("User Logged Out"));
        Assert.Null(parser.ReadLine(Line($"Loading Avatar Data:{Avatar}")));
    }

    [Fact]
    public void ImportAggregatesOriginalTimesAndSkipsOtherAccountsAndUnreadableFiles()
    {
        var directory = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        Directory.CreateDirectory(directory);
        try
        {
            File.WriteAllLines(Path.Combine(directory, "output_log_a.txt"), new[]
            {
                Login(Account), Line($"Loading Avatar Data:{Avatar}"),
                Line($"Saving Avatar Data:{Avatar}", "2026.10.27 11:00:00"),
                Login(Other), Line("Loading Avatar Data:avtr_bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
            });
            File.WriteAllLines(Path.Combine(directory, "output_log_b.txt"), new[]
            {
                Login(Account), Line($"Saving Avatar Data:{Avatar}", "2026.10.26 09:00:00")
            });
            using var locked = new FileStream(Path.Combine(directory, "output_log_locked.txt"), FileMode.Create, FileAccess.ReadWrite, FileShare.None);
            var result = FoundAvatarLogReader.ScanDirectory(directory, Account);
            var observation = Assert.Single(result.Observations);
            Assert.Equal(Avatar, observation.AvatarId);
            Assert.Equal(new DateTime(2026, 10, 26, 9, 0, 0, DateTimeKind.Local).ToUniversalTime(), observation.FirstSeenAt);
            Assert.Equal(new DateTime(2026, 10, 27, 11, 0, 0, DateTimeKind.Local).ToUniversalTime(), observation.LastSeenAt);
            Assert.Equal(1, result.Errors);
            Assert.Equal(2, result.FilesRead);
            var repeated = FoundAvatarLogReader.ScanDirectory(directory, Account);
            Assert.Equal(observation.FirstSeenAt, Assert.Single(repeated.Observations).FirstSeenAt);
        }
        finally { Directory.Delete(directory, true); }
    }
}
