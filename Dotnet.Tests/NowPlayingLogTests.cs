using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Threading;
using VRCX;
using Xunit;
public class NowPlayingLogTests
{
    [Theory]
    [InlineData("nowplaying {\"id\":\"Main-1\",\"type\":\"mediaPause\",\"mediaTime\":12.5}")]
    [InlineData("[ProTV] nowplaying {\"id\":\"Main-1\",\"type\":\"mediaChange\",\"mediaName\":\"Curly } title\"}")]
    public void NativeLogParserEmitsStructuredPayload(string message)
    {
        var watcher = new LogWatcher();
        var list = new List<string[]>();
        typeof(LogWatcher).GetField("m_LogList", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(watcher,list);
        using var gate = new ReaderWriterLockSlim();
        typeof(LogWatcher).GetField("m_LogListLock", BindingFlags.Instance | BindingFlags.NonPublic)!.SetValue(watcher,gate);
        var method = typeof(LogWatcher).GetMethod("ParseLogNowPlaying", BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(method);
        Assert.Equal(true, method!.Invoke(watcher,new object[] {new FileInfo("output_log_test.txt"), null!, "2026.10.31 00:00:00 Debug      -  " + message, 33}));
        var row = Assert.Single(list);
        Assert.Equal("nowplaying",row[2]);
        Assert.StartsWith("{",row[3]);
        Assert.EndsWith("}",row[3]);
        Assert.Contains("\"id\":\"Main-1\"",row[3]);
    }
}
