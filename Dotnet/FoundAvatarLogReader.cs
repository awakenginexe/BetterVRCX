using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Text.RegularExpressions;

namespace VRCX
{
    internal sealed class FoundAvatarLogReader
    {
        private const string Uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
        private static readonly Regex Authentication = new(@"^User Authenticated: .*\((usr_" + Uuid + @")\)\s*$", RegexOptions.Compiled);
        private static readonly Regex AvatarData = new(@"^(?:Loading|Saving) Avatar Data:(avtr_" + Uuid + @")\s*$", RegexOptions.Compiled);
        private string _observerId = string.Empty;

        internal sealed record Observation(string AvatarId, string ObserverId, DateTime ObservedAt);
        internal sealed record Discovery(string AvatarId, DateTime FirstSeenAt, DateTime LastSeenAt);
        internal sealed record ScanResult(IReadOnlyList<Discovery> Observations, int FilesRead, int FilesSkipped, int Errors);

        internal Observation? ReadLine(string line)
        {
            if (line.Length < 34 || line[31] != '-' || !DateTime.TryParseExact(line.AsSpan(0, 19),
                    "yyyy.MM.dd HH:mm:ss", CultureInfo.InvariantCulture, DateTimeStyles.AssumeLocal, out var date))
                return null;
            var message = line.Substring(34);
            if (message.StartsWith("User Authenticated:", StringComparison.Ordinal))
            {
                var authentication = Authentication.Match(message);
                _observerId = authentication.Success ? authentication.Groups[1].Value.ToLowerInvariant() : string.Empty;
                return null;
            }
            if (message.StartsWith("User Logged Out", StringComparison.Ordinal) || message.StartsWith("Logging out", StringComparison.Ordinal))
                _observerId = string.Empty;
            if (_observerId.Length == 0) return null;
            var avatar = AvatarData.Match(message);
            return avatar.Success ? new Observation(avatar.Groups[1].Value.ToLowerInvariant(), _observerId, date.ToUniversalTime()) : null;
        }

        internal static ScanResult ScanDirectory(string directory, string observerId)
        {
            var discoveries = new Dictionary<string, Discovery>();
            var filesRead = 0;
            var filesSkipped = 0;
            var errors = 0;
            foreach (var file in Directory.EnumerateFiles(directory, "output_log_*.txt"))
            {
                try
                {
                    using var stream = new FileStream(file, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                    using var reader = new StreamReader(stream);
                    var parser = new FoundAvatarLogReader();
                    var matched = false;
                    string? line;
                    while ((line = reader.ReadLine()) != null)
                    {
                        var observation = parser.ReadLine(line);
                        if (observation == null || !string.Equals(observation.ObserverId, observerId, StringComparison.OrdinalIgnoreCase)) continue;
                        matched = true;
                        var time = observation.ObservedAt;
                        if (discoveries.TryGetValue(observation.AvatarId, out var old))
                            discoveries[observation.AvatarId] = old with { FirstSeenAt = time < old.FirstSeenAt ? time : old.FirstSeenAt, LastSeenAt = time > old.LastSeenAt ? time : old.LastSeenAt };
                        else
                            discoveries[observation.AvatarId] = new Discovery(observation.AvatarId, time, time);
                    }
                    filesRead++;
                    if (!matched) filesSkipped++;
                }
                catch (IOException) { errors++; filesSkipped++; }
                catch (UnauthorizedAccessException) { errors++; filesSkipped++; }
            }
            return new ScanResult(discoveries.Values.OrderBy(item => item.FirstSeenAt).ToArray(), filesRead, filesSkipped, errors);
        }
    }
}
