using System;
using Xunit;

namespace BetterVRCX.Tests;

public sealed class DatabaseBackupApiTests
{
    [Fact]
    public void ApplyLastBackupStatus_updates_the_summary_after_upload()
    {
        var status = new VRCX.CloudBackupStatus(
            "backing_up",
            Connected: true,
            Email: "user@example.com",
            LastBackupAt: null,
            LastBackupName: null,
            LastBackupSize: 0,
            Error: null);
        var backup = new VRCX.GoogleDriveBackupState(
            new DateTimeOffset(2026, 8, 20, 1, 16, 9, TimeSpan.Zero),
            "RISEPROANXE-2026-08-20.sqlite3",
            34_700_000,
            "RISEPROANXE");

        var result = VRCX.DatabaseBackupApi.ApplyLastBackupStatus(status, backup);

        Assert.Equal(backup.CreatedAt, result.LastBackupAt);
        Assert.Equal(backup.Name, result.LastBackupName);
        Assert.Equal(backup.Size, result.LastBackupSize);
        Assert.Equal(status.Email, result.Email);
    }
}
