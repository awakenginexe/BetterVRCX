using System;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;

namespace VRCX
{
    public partial class AppApi
    {
        public Task<string> GetFoundAvatarLogData(string accountId)
        {
            if (string.IsNullOrWhiteSpace(accountId) || !accountId.StartsWith("usr_", StringComparison.Ordinal) || !Guid.TryParseExact(accountId.Substring(4), "D", out _))
                throw new ArgumentException("A valid observer account ID is required.", nameof(accountId));
            var directory = GetVRChatAppDataLocation();
            return Task.Run(() =>
            {
                var result = FoundAvatarLogReader.ScanDirectory(directory, accountId);
                return JsonSerializer.Serialize(new
                {
                    observations = result.Observations.Select(item => new { avatarId = item.AvatarId, firstSeenAt = item.FirstSeenAt, lastSeenAt = item.LastSeenAt }),
                    filesRead = result.FilesRead,
                    filesSkipped = result.FilesSkipped,
                    errors = result.Errors
                });
            });
        }
    }
}
