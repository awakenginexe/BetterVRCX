using System;
namespace VRCX
{
    internal static class BrowserDataVersion
    {
        public static bool RequiresReset(string previous, string current) =>
            !Version.TryParse(previous, out var previousVersion) ||
            !Version.TryParse(current, out var currentVersion) || previousVersion > currentVersion;
    }
}
