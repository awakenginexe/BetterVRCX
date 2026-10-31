using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using System.Reflection;
using System.Threading.Tasks;
using VRCX;
using Xunit;
public class SQLiteInsertTests
{
    [Fact]
    public async Task AtomicInsertReturnsOwnIdAndZeroForIgnoredDuplicates()
    {
        var path = Path.Combine(Path.GetTempPath(), "bettervrcx-inserts-" + Guid.NewGuid() + ".db");
        var sqlite = new SQLite();
        var connection = new SQLiteConnection($"Data Source={path};Version=3;");
        connection.Open();
        typeof(SQLite).GetField("m_Connection", BindingFlags.NonPublic | BindingFlags.Instance)!.SetValue(sqlite, connection);
        try
        {
            sqlite.ExecuteNonQuery("CREATE TABLE entries (id INTEGER PRIMARY KEY, value TEXT UNIQUE)");
            var method = typeof(SQLite).GetMethod("ExecuteInsert");
            Assert.NotNull(method);
            var tasks = new Task<long>[20];
            for (var i = 0; i < tasks.Length; i++)
            {
                var value = i.ToString();
                tasks[i] = Task.Run(() => (long)method!.Invoke(sqlite, new object[] { "INSERT OR IGNORE INTO entries (value) VALUES (@value)", new Dictionary<string, object> { ["@value"] = value } })!);
            }
            var ids = await Task.WhenAll(tasks);
            for (var i = 0; i < ids.Length; i++)
                Assert.Equal(i.ToString(), sqlite.Execute("SELECT value FROM entries WHERE id = @id", new Dictionary<string, object> { ["@id"] = ids[i] })[0][0]);
            Assert.Equal(0L, method!.Invoke(sqlite, new object[] { "INSERT OR IGNORE INTO entries (value) VALUES ('0')", null! }));
        }
        finally { sqlite.Exit(); SQLiteConnection.ClearAllPools(); File.Delete(path); }
    }
}
