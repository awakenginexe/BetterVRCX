using System;
using System.Collections.Generic;
using System.Data.SQLite;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading;

namespace VRCX
{
    public class SQLite
    {
        public static SQLite Instance;
        private readonly ReaderWriterLockSlim m_ConnectionLock;
        private SQLiteConnection? m_Connection;
        private string? m_DataSource;

        static SQLite()
        {
            Instance = new SQLite();
        }

        public SQLite()
        {
            m_ConnectionLock = new ReaderWriterLockSlim();
        }

        public void Init()
        {
#if LINUX
            Instance = this;
#endif
            var dataSource = Program.ConfigLocation;
            var jsonDataSource = VRCXStorage.Instance.Get("VRCX_DatabaseLocation");
            if (!string.IsNullOrEmpty(jsonDataSource))
                dataSource = jsonDataSource;

            m_DataSource = dataSource;
            OpenConnection();
        }

        public void Exit()
        {
            m_ConnectionLock.EnterWriteLock();
            try
            {
                CloseConnection();
            }
            finally
            {
                m_ConnectionLock.ExitWriteLock();
            }
        }

        public string GetDatabaseLocation()
        {
            m_ConnectionLock.EnterReadLock();
            try
            {
                return m_DataSource ?? Program.ConfigLocation;
            }
            finally
            {
                m_ConnectionLock.ExitReadLock();
            }
        }

        internal TResult WithWriteLock<TResult>(Func<SQLiteConnection, TResult> operation)
        {
            ArgumentNullException.ThrowIfNull(operation);
            m_ConnectionLock.EnterWriteLock();
            try
            {
                return operation(GetConnection());
            }
            finally
            {
                m_ConnectionLock.ExitWriteLock();
            }
        }

        internal TResult WithDatabaseClosed<TResult>(Func<string, TResult> operation)
        {
            ArgumentNullException.ThrowIfNull(operation);
            m_ConnectionLock.EnterWriteLock();
            try
            {
                var dataSource = m_DataSource ?? Program.ConfigLocation;
                m_DataSource = dataSource;
                CloseConnection();
                return operation(dataSource);
            }
            finally
            {
                try
                {
                    if (m_Connection == null && !string.IsNullOrEmpty(m_DataSource))
                        OpenConnection();
                }
                finally
                {
                    m_ConnectionLock.ExitWriteLock();
                }
            }
        }

        // for Electron
        public string ExecuteJson(string sql, IDictionary<string, object>? args = null)
        {
            var result = Execute(sql, args);
            return JsonSerializer.Serialize(result);
        }

        public object[][] Execute(string sql, IDictionary<string, object>? args = null)
        {
            m_ConnectionLock.EnterReadLock();
            try
            {
                using var command = new SQLiteCommand(sql, GetConnection());
                if (args != null)
                {
                    foreach (var arg in args)
                    {
                        command.Parameters.Add(new SQLiteParameter(arg.Key, arg.Value));
                    }
                }

                using var reader = command.ExecuteReader();
                var result = new List<object[]>();
                while (reader.Read())
                {
                    var values = new object[reader.FieldCount];
                    for (var i = 0; i < reader.FieldCount; i++)
                    {
                        values[i] = reader.GetValue(i);
                    }
                    result.Add(values);
                }
                return result.ToArray();
            }
            finally
            {
                m_ConnectionLock.ExitReadLock();
            }
        }

        public int ExecuteNonQuery(string sql, IDictionary<string, object>? args = null)
        {
            var result = -1;
            m_ConnectionLock.EnterWriteLock();
            try
            {
                using var command = new SQLiteCommand(sql, GetConnection());
                if (args != null)
                {
                    foreach (var arg in args)
                    {
                        command.Parameters.Add(new SQLiteParameter(arg.Key, arg.Value));
                    }
                }
                result = command.ExecuteNonQuery();
            }
            finally
            {
                m_ConnectionLock.ExitWriteLock();
            }

            return result;
        }

        private SQLiteConnection GetConnection()
        {
            return m_Connection ?? throw new InvalidOperationException("The SQLite connection is not initialized.");
        }

        private void OpenConnection()
        {
            var dataSource = m_DataSource ?? throw new InvalidOperationException("The SQLite database location is not initialized.");
            m_Connection = new SQLiteConnection($"Data Source=\"{dataSource}\";Version=3;PRAGMA locking_mode=NORMAL;PRAGMA busy_timeout=5000;PRAGMA journal_mode=WAL;PRAGMA optimize=0x10002;", true);
            m_Connection.Open();
        }

        private void CloseConnection()
        {
            if (m_Connection == null)
                return;

            m_Connection.Close();
            m_Connection.Dispose();
            m_Connection = null;
        }
    }
}
