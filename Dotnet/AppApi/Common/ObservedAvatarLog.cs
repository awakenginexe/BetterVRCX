using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace VRCX
{
    public partial class AppApi
    {
        private static readonly Regex LoggedAvatarId = new(@"(?:Loading|Saving) Avatar Data:(avtr_[0-9a-fA-F-]{36})", RegexOptions.Compiled);
        private static readonly Regex LoggedAvatarAuthor = new(@"\[AssetBundleDownloadManager\].*Unpacking Avatar \((.+) by (.+)\)$", RegexOptions.Compiled);

        public string GetObservedAvatarLogData(string displayName)
        {
            var avatarName = string.Empty;
            var avatarAuthorName = string.Empty;
            var avatarAuthors = new HashSet<string>(StringComparer.Ordinal);
            var avatarIds = new Queue<string>();
            var seenIds = new HashSet<string>(StringComparer.Ordinal);
            try
            {
                if (string.IsNullOrWhiteSpace(displayName))
                    return JsonSerializer.Serialize(new { avatarName, avatarAuthorName, avatarIds });

                var directory = GetVRChatAppDataLocation();
                var file = new DirectoryInfo(directory).GetFiles("output_log_*.txt")
                    .OrderByDescending(item => item.LastWriteTimeUtc).FirstOrDefault();
                if (file == null)
                    return JsonSerializer.Serialize(new { avatarName, avatarAuthorName, avatarIds });

                using var stream = new FileStream(file.FullName, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
                using var reader = new StreamReader(stream, Encoding.UTF8);
                string line;
                while ((line = reader.ReadLine()) != null)
                {
                    if (line.Contains("[Behaviour] Joining wrld_", StringComparison.Ordinal) ||
                        line.Contains("[Behaviour] OnLeftRoom", StringComparison.Ordinal))
                    {
                        avatarName = string.Empty;
                        avatarAuthorName = string.Empty;
                        avatarAuthors.Clear();
                        avatarIds.Clear();
                        seenIds.Clear();
                        continue;
                    }

                    var start = line.IndexOf("[Behaviour] Switching ", StringComparison.Ordinal);
                    if (start >= 0)
                    {
                        start += "[Behaviour] Switching ".Length;
                        var end = line.LastIndexOf(" to avatar ", StringComparison.Ordinal);
                        if (end > start && string.Equals(line.Substring(start, end - start), displayName, StringComparison.Ordinal))
                        {
                            avatarName = line.Substring(end + " to avatar ".Length);
                            avatarAuthorName = string.Empty;
                            avatarAuthors.Clear();
                            avatarIds.Clear();
                            seenIds.Clear();
                        }
                    }

                    var authorMatch = LoggedAvatarAuthor.Match(line);
                    if (!string.IsNullOrEmpty(avatarName) && authorMatch.Success &&
                        string.Equals(authorMatch.Groups[1].Value.Normalize(NormalizationForm.FormKC),
                            avatarName.Normalize(NormalizationForm.FormKC), StringComparison.Ordinal))
                    {
                        avatarAuthors.Add(authorMatch.Groups[2].Value);
                        avatarAuthorName = avatarAuthors.Count == 1 ? avatarAuthors.First() : string.Empty;
                    }

                    var match = LoggedAvatarId.Match(line);
                    if (!match.Success || !seenIds.Add(match.Groups[1].Value))
                        continue;
                    avatarIds.Enqueue(match.Groups[1].Value);
                    if (avatarIds.Count > 100)
                        seenIds.Remove(avatarIds.Dequeue());
                }
            }
            catch (IOException)
            {
                return JsonSerializer.Serialize(new { avatarName = string.Empty, avatarAuthorName = string.Empty, avatarIds = Array.Empty<string>() });
            }
            catch (UnauthorizedAccessException)
            {
                return JsonSerializer.Serialize(new { avatarName = string.Empty, avatarAuthorName = string.Empty, avatarIds = Array.Empty<string>() });
            }
            return JsonSerializer.Serialize(new { avatarName, avatarAuthorName, avatarIds });
        }
    }
}
