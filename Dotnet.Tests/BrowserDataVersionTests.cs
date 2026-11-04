using System;
using System.Reflection;
using VRCX;
using Xunit;
public class BrowserDataVersionTests
{
    [Theory]
    [InlineData("149.9.9999.100", "150.0.1.0", false)]
    [InlineData("150.0.1.1", "150.0.1.1", false)]
    [InlineData("150.0.1.2", "150.0.1.1", true)]
    [InlineData("151.0.0.0", "150.9.9999.999", true)]
    [InlineData("unknown", "150.0.1.1", true)]
    public void ComparesWholeVersionsBeforeRemovingBrowserData(string previous, string current, bool expected)
    {
        var type = typeof(SQLite).Assembly.GetType("VRCX.BrowserDataVersion");
        Assert.NotNull(type);
        Assert.Equal(expected, type!.GetMethod("RequiresReset", BindingFlags.Static | BindingFlags.Public)!.Invoke(null, new object[] {previous,current}));
    }
}
