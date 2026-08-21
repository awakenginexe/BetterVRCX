using VRCX;
using Xunit;

namespace BetterVRCX.Tests;

public sealed class DiscordTests
{
    [Fact]
    public void Large_image_click_uses_the_BetterVRCX_website()
    {
        Assert.Equal(
            "https://bettervrcx.awakenginexe.com/",
            Discord.BetterVrcxUrl);
    }
}
